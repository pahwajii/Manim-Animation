from manim import *

class Test(Scene):
    def construct(self):
        text = Text("My First Local Manim Animation!")
        self.play(Write(text))
        self.wait(1)
