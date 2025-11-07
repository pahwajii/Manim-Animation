// server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ffmpeg from "fluent-ffmpeg";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* -------------------- Config -------------------- */
const PORT = Number(process.env.PORT || 3000);
const GEMINI_MODEL = process.env.GEMINI_MODEL || "models/gemini-2.5-pro-exp";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

/** Your confirmed venv manim.exe path (Windows) */
// const MANIM_EXE = "D:/manimfixerai2/manimenv/Scripts/manim.exe";
/** Portable Manim CLI: env override > python3 -m manim (default) */
const MANIM_CLI = process.env.MANIM_CLI || "python3 -m manim";
const MANIM_EXE = MANIM_CLI;

/** Python executable for gTTS */
const PYTHON_EXE = "D:/manimfixerai2/manimenv/Scripts/python.exe";

/** We keep a single scene name always (choice A) */
const SCENE_NAME = "GeneratedScene";

/* -------------------- Express setup -------------------- */
const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

/** Public videos output (served statically) */
const videosDir = path.join(__dirname, "../../public/videos");
fs.mkdir(videosDir, { recursive: true });
app.use("/videos", express.static(videosDir));

/** Serve built frontend if present */
const clientDist = path.join(__dirname, "../../frontend/dist");
app.use(express.static(clientDist));

/* -------------------- Helpers -------------------- */
async function findMp4Files(dir: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        out.push(...(await findMp4Files(full)));
      } else if (e.isFile() && e.name.toLowerCase().endsWith(".mp4")) {
        out.push(full);
      }
    }
  } catch {
    /* ignore missing dirs */
  }
  // Stable sort by mtime so "latest" is deterministic
  const stats = await Promise.all(
    out.map(async (p) => ({ p, t: (await fs.stat(p)).mtimeMs }))
  );
  stats.sort((a, b) => a.t - b.t);
  return stats.map((s) => s.p);
}

/** Execute Manim CLI with fresh media_dir and unique output name */
async function executeManimCode(code: string, sessionId: string) {
  const rootTemp = path.join(__dirname, "../../temp");
  const tempDir = path.join(rootTemp, sessionId); // isolate per request
  const scriptPath = path.join(tempDir, `${sessionId}.py`);
  const mediaDir = path.join(tempDir, "media");

  await fs.mkdir(tempDir, { recursive: true });
  await fs.writeFile(scriptPath, code, "utf8");

  // New Manim syntax (v0.19+): manim render <file> <Scene> ...
  // --quality=h ~= high, --disable_caching ensures fresh frames,
  // --media_dir puts outputs in tempDir/media
  const outBase = `${SCENE_NAME}_${sessionId}`;
  const cmd = `"${MANIM_EXE}" render "${scriptPath}" ${SCENE_NAME} ` +
              `--quality=h --disable_caching --media_dir "${mediaDir}" -o "${outBase}"`;

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: tempDir,
      timeout: 3 * 60 * 1000, // 3 minutes; adjust as you like
    });

    // Manim default layout: media/videos/<script stem>/720p30/<outBase>.mp4
    const mp4s = await findMp4Files(mediaDir);
    const latest = mp4s.at(-1);
    if (!latest) {
      return {
        success: false,
        error: "Render finished but no MP4 found",
        stdout,
        stderr,
        cmd,
      };
    }

    const finalName = `${sessionId}.mp4`;
    const finalAbs = path.join(videosDir, finalName);
    await fs.copyFile(latest, finalAbs);

    return {
      success: true,
      videoPath: `/videos/${finalName}`,
      stdout,
      stderr,
      cmd,
    };
  } catch (e: any) {
    return {
      success: false,
      error: e?.stderr || e?.message || "Execution failed",
      cmd,
    };
  }
}

/* -------------------- Gemini codegen -------------------- */
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// gTTS is always available (no API keys needed!)
let ttsAvailable = true;

function initTTSClient(): boolean {
  // gTTS is free and always available - just check if Python is accessible
  console.log("✓ gTTS ready (free, no API keys needed!)");
  return ttsAvailable;
}

/** Generate ONLY the class code (no __main__), fixed class name. */
async function generateManimCode(prompt: string, prev?: string, prevErr?: string) {
  const systemPrompt =
    prev && prevErr
      ? `Fix this Manim Community Edition code. Return ONLY Python code for a single scene class.

CRITICAL REQUIREMENTS:
- Must start with: from manim import *
- Class name MUST be ${SCENE_NAME}
- Implement construct(self)
- Do NOT include if __name__ == "__main__" or any CLI running code
- Use self.play() for animations
- Use self.wait() to control timing (minimum 1 second)
- Keep animations SIMPLE and focused

Previous code:
${prev}

Error to fix:
${prevErr}

Task: Fix the error while keeping the code simple and working. Add self.wait() at the end.`
      : `You are an expert Manim Community Edition programmer. Write code for ONE scene.

CRITICAL REQUIREMENTS:
✓ Start with: from manim import *
✓ Class name MUST be: ${SCENE_NAME}
✓ Subclass Scene (or ThreeDScene for 3D)
✓ Implement construct(self) method
✓ Use self.play() for ALL animations
✓ Add self.wait(2) at the end for visibility
✓ Keep code SIMPLE - avoid complex logic
✓ NO if __name__ == "__main__"
✓ NO command-line execution code

MANIM BASICS:
- Objects: Circle(), Square(), Text(), Dot(), Line(), Triangle(), etc.
- 3D: Cube(), Sphere(), ThreeDAxes() (use ThreeDScene)
- Animations: Create(), Write(), FadeIn(), FadeOut(), Transform(), Rotate(), GrowFromCenter()
- Colors: RED, BLUE, GREEN, YELLOW, PURPLE, ORANGE, WHITE
- Use VGroup() to group objects
- Use animate for simple animations: self.play(obj.animate.shift(RIGHT))

EXAMPLES:

Example 1 - Simple shape:
from manim import *

class ${SCENE_NAME}(Scene):
    def construct(self):
        circle = Circle(color=BLUE)
        self.play(Create(circle))
        self.wait(2)

Example 2 - Transform:
from manim import *

class ${SCENE_NAME}(Scene):
    def construct(self):
        circle = Circle(color=BLUE)
        square = Square(color=RED)
        self.play(Create(circle))
        self.wait(1)
        self.play(Transform(circle, square))
        self.wait(2)

Example 3 - 3D:
from manim import *

class ${SCENE_NAME}(ThreeDScene):
    def construct(self):
        cube = Cube(color=BLUE)
        self.play(Create(cube))
        self.play(Rotate(cube, angle=PI, axis=UP))
        self.wait(2)

Example 4 - Text:
from manim import *

class ${SCENE_NAME}(Scene):
    def construct(self):
        text = Text("Hello Manim")
        self.play(Write(text))
        self.wait(2)

NOW CREATE CODE FOR: "${prompt}"

Return ONLY the Python code, nothing else.`;

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(systemPrompt);
  const text = result.response.text().replace(/```python|```/g, "").trim();
  if (!text) throw new Error("Gemini returned empty code");
  // Guard-rail: ensure the class name is present
  if (!new RegExp(`class\\s+${SCENE_NAME}\\s*\\(`).test(text)) {
    throw new Error(`Generated code does not declare class ${SCENE_NAME}`);
  }
  return text;
}

/** Generate narration script based on animation content */
async function generateNarrationScript(prompt: string, code: string): Promise<string> {
  const systemPrompt = `You are creating a voice-over narration for a mathematical animation video.

The user requested: "${prompt}"

The animation code:
${code}

Write a clear, engaging narration script (2-4 sentences) that explains what viewers will see in this animation.
- Use simple, conversational language
- Describe the visual elements and their purpose
- Keep it concise and educational
- Return ONLY the narration text, no extra formatting`;

  const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
  const result = await model.generateContent(systemPrompt);
  const text = result.response.text().trim();
  if (!text) throw new Error("Gemini returned empty narration");
  return text;
}

/** Convert text to speech using gTTS (Google Text-to-Speech) */
async function textToSpeechAudio(text: string, outputPath: string): Promise<number> {
  try {
    // Create a temporary Python script to run gTTS and get duration
    const tempDir = path.dirname(outputPath);
    const scriptPath = path.join(tempDir, "tts_script.py");
    
    const pythonScript = `
from gtts import gTTS
import sys
from mutagen.mp3 import MP3

text = """${text.replace(/"/g, '\\"')}"""
output = """${outputPath.replace(/\\/g, "/")}"""

tts = gTTS(text=text, lang='en', slow=False)
tts.save(output)

# Get audio duration
audio = MP3(output)
duration = audio.info.length
print(f"TTS_DURATION:{duration}")
`;

    await fs.writeFile(scriptPath, pythonScript, "utf8");
    
    // Run the Python script
    const { stdout, stderr } = await execAsync(`"${PYTHON_EXE}" "${scriptPath}"`, {
      cwd: tempDir,
      timeout: 30000, // 30 seconds timeout
    });

    // Clean up the script
    await fs.unlink(scriptPath).catch(() => {});
    
    // Extract duration from output
    const durationMatch = stdout.match(/TTS_DURATION:([\d.]+)/);
    const duration = durationMatch ? parseFloat(durationMatch[1]) : 0;
    
    if (stderr && !durationMatch) {
      throw new Error(stderr);
    }
    
    return duration;
  } catch (error: any) {
    throw new Error(`gTTS failed: ${error.message}`);
  }
}

/** Get video duration using ffprobe */
async function getVideoDuration(videoPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error) {
    return 0;
  }
}

/** Extend video to match audio duration by looping or freezing last frame */
async function extendVideoToMatchAudio(videoPath: string, targetDuration: number, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .inputOptions([
        '-stream_loop', '-1'  // Loop the video
      ])
      .outputOptions([
        '-t', targetDuration.toString(),  // Cut at target duration
        '-c:v', 'libx264',
        '-preset', 'fast'
      ])
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

/** Merge video and audio using ffmpeg */
async function mergeVideoAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        "-c:v copy",
        "-c:a aac",
        "-shortest"
      ])
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .save(outputPath);
  });
}

/* -------------------- Routes -------------------- */
app.post("/api/generate", async (req, res) => {
  try {
    const { prompt } = req.body as { prompt?: string };
    if (!prompt) return res.status(400).json({ success: false, error: "Prompt required" });
    if (!GEMINI_API_KEY) return res.status(401).json({ success: false, error: "GEMINI_API_KEY missing" });

    const sessionId = Date.now().toString();
    const iterations: Array<{
      iteration: number;
      code: string;
      success: boolean;
      error?: string;
      timestamp: string;
      cmd?: string;
    }> = [];

    let code = "";
    let lastErr = "";

    for (let i = 0; i < 5; i++) {
      code = await generateManimCode(prompt, i > 0 ? code : undefined, i > 0 ? lastErr : undefined);
      const execResult = await executeManimCode(code, sessionId);

      iterations.push({
        iteration: i + 1,
        code,
        success: !!execResult.success,
        error: execResult.success ? undefined : execResult.error,
        timestamp: new Date().toISOString(),
        cmd: (execResult as any).cmd,
      });

      if (execResult.success) {
        let narration = "";
        let finalVideoPath = execResult.videoPath;

        // Only attempt voice-over if TTS can be initialized
        if (initTTSClient()) {
          try {
            // Generate narration script
            narration = await generateNarrationScript(prompt, code);

            // Convert to speech and get audio duration
            const audioPath = path.join(videosDir, `${sessionId}_audio.mp3`);
            const audioDuration = await textToSpeechAudio(narration, audioPath);
            console.log(`📢 Audio duration: ${audioDuration.toFixed(2)}s`);

            // Get original video duration
            const originalVideoPath = path.join(videosDir, `${sessionId}.mp4`);
            const videoDuration = await getVideoDuration(originalVideoPath);
            console.log(`🎬 Video duration: ${videoDuration.toFixed(2)}s`);

            let videoToMerge = originalVideoPath;

            // If audio is longer than video, extend the video
            if (audioDuration > videoDuration + 0.5) {
              console.log(`⏱️ Extending video to match audio duration...`);
              const extendedVideoPath = path.join(videosDir, `${sessionId}_extended.mp4`);
              await extendVideoToMatchAudio(originalVideoPath, audioDuration, extendedVideoPath);
              videoToMerge = extendedVideoPath;
              console.log(`✓ Video extended to ${audioDuration.toFixed(2)}s`);
            }

            // Merge video and audio
            const videoWithAudioName = `${sessionId}_with_audio.mp4`;
            const videoWithAudioPath = path.join(videosDir, videoWithAudioName);
            
            await mergeVideoAudio(videoToMerge, audioPath, videoWithAudioPath);
            
            finalVideoPath = `/videos/${videoWithAudioName}`;
            console.log("✓ Voice-over added successfully");
          } catch (voiceErr: any) {
            console.error("⚠ Voice-over generation failed:", voiceErr.message);
            // Continue without voice-over if it fails - don't crash the server!
          }
        } else {
          console.log("ℹ Skipping voice-over (TTS not configured)");
        }

        return res.json({
          success: true,
          videoPath: finalVideoPath,
          narration,
          iterations,
        });
      }
      lastErr = execResult.error || "";
    }

    return res.json({ success: false, error: lastErr || "All attempts failed", iterations });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "Internal error" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    model: GEMINI_MODEL,
    geminiConfigured: Boolean(GEMINI_API_KEY),
    manimPath: MANIM_EXE,
    sceneName: SCENE_NAME,
  });
});

/** SPA fallback */
app.get("*", async (_req, res) => {
  try {
    const html = await fs.readFile(path.join(clientDist, "index.html"), "utf8");
    res.setHeader("Content-Type", "text/html");
    res.status(200).send(html);
  } catch {
    res.status(404).send("Not found");
  }
});

/* -------------------- Start -------------------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
