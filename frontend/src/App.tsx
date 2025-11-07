import { useState } from 'react'
import { Wand2, Loader2, AlertCircle, CheckCircle, Download, Code2 } from 'lucide-react'
import Editor from '@monaco-editor/react'

interface IterationLog {
  iteration: number;
  code: string;
  error?: string;
  success: boolean;
  timestamp: string;
}

interface GenerateResponse {
  success: boolean;
  videoPath?: string;
  narration?: string;
  iterations: IterationLog[];
  error?: string;
}

function App() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [selectedIteration, setSelectedIteration] = useState<number>(0)

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      let data = null
      try {
        data = await response.json()
      } catch (e) {}

      if (!response.ok) {
        const msg = data?.error || `Request failed: ${response.status}`
        setResult({ success: false, error: msg, iterations: [] })
        setSelectedIteration(0)
        return
      }

      const iterations = Array.isArray(data.iterations) ? data.iterations : []
      const normalized: GenerateResponse = {
        success: Boolean(data.success),
        videoPath: data.videoPath,
        narration: data.narration,
        iterations,
        error: data.error,
      }

      setResult(normalized)
      setSelectedIteration(iterations.length > 0 ? iterations.length - 1 : 0)
    } catch (err) {
      setResult({ success: false, error: "Failed to connect backend", iterations: [] })
      setSelectedIteration(0)
    } finally {
      setLoading(false)
    }
  }

  const downloadVideo = () => {
    if (result?.videoPath) {
      const link = document.createElement('a')
      link.href = `${result.videoPath}`
      link.download = 'manim-animation.mp4'
      link.click()
    }
  }

  const downloadCode = () => {
    if (result?.iterations?.length) {
      const code = result.iterations[result.iterations.length - 1].code
      const blob = new Blob([code], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'manim_scene.py'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const currentIteration = result?.iterations[selectedIteration]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">

        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 flex items-center justify-center gap-3">
            <Wand2 className="w-12 h-12" />
            Manim AI Pipeline
          </h1>
          <p className="text-slate-300 text-lg">Describe animation → AI → Code → Auto Fix → Render</p>
        </div>

        <div className="max-w-4xl mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g. Create rotating cube with labels each face"
            className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-slate-400 border border-white/30 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
            disabled={loading}
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg mt-4
                       hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating</> : <><Wand2 className="w-5 h-5" /> Generate</>}
          </button>
        </div>

        {result && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4 text-white text-xl font-semibold">
                {result.success ? <><CheckCircle className="text-green-400" /> Success!</> : <><AlertCircle className="text-red-400" /> Failed</>}
                <span className="text-slate-300">{result.iterations?.length ?? 0} iteration(s)</span>
              </div>

              {result.success && result.videoPath && (
                <div className="mb-6">
                  <video src={result.videoPath} controls className="w-full rounded-lg shadow-lg"/>
                  
                  {result.narration && (
                    <div className="mt-4 bg-blue-500/20 border border-blue-500 rounded-lg p-4">
                      <h4 className="text-blue-200 font-semibold mb-2 flex items-center gap-2">
                        🎙️ Voice-Over Narration
                      </h4>
                      <p className="text-blue-100">{result.narration}</p>
                    </div>
                  )}
                  
                  <button onClick={downloadVideo} className="mt-3 bg-green-600 text-white px-4 py-2 rounded-lg flex gap-2 items-center">
                    <Download className="w-4 h-4" /> Download Video
                  </button>
                </div>
              )}

              {result.error && !result.success && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200 mb-4">{result.error}</div>
              )}

              <div className="mb-4">
                <h3 className="text-xl font-semibold text-white mb-3">Iteration History</h3>
                <div className="flex gap-2 flex-wrap">
                  {result.iterations.map((iter, idx) => (
                    <button key={idx} onClick={() => setSelectedIteration(idx)}
                      className={`px-4 py-2 rounded-lg font-semibold transition 
                                 ${selectedIteration === idx ? 'bg-purple-600 text-white' :
                                   iter.success ? 'bg-green-600/30 text-green-200' :
                                   'bg-red-600/30 text-red-200'}`}>
                      #{iter.iteration} {iter.success ? '✓' : '✗'}
                    </button>
                  ))}
                </div>
              </div>

              {currentIteration && (
                <div>
                  <div className="flex items-center justify-between mb-3 text-white">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <Code2 className="w-5 h-5" />
                      Code - Iteration {currentIteration.iteration}
                    </h3>
                    <button onClick={downloadCode} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                      <Download className="w-4 h-4" /> Download Code
                    </button>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-white/20 mb-4">
                    <Editor height="350px" defaultLanguage="python" value={currentIteration.code} theme="vs-dark"
                      options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14 }} />
                  </div>

                  {currentIteration.error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200 whitespace-pre-wrap">
                      {currentIteration.error}
                    </div>
                  )}

                  {currentIteration.success && (
                    <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 text-green-200 font-semibold">
                      ✓ Code executed successfully!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
