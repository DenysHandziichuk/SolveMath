import { NextRequest, NextResponse } from "next/server";
import { groq } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    const systemPrompt = `You are a world-class math tutor. Provide a detailed, pedagogical solution to the math question provided. Ensure comprehensive coverage across these topics:
A. CHARACTERISTICS OF FUNCTIONS: Polynomials, Rational, Quadratics (zeros, max/min, equivalence).
B. EXPONENTIAL FUNCTIONS: Evaluating, properties, representations.
C. TRIGONOMETRIC FUNCTIONS: Sine/Cosine Law, Identities, Periodic/Sinusoidal functions.
D. DISCRETE FUNCTIONS: Sequences (Arithmetic/Geometric/Recursive), Pascal's Triangle, Financial Math (Annuities, Compound Interest).

### PEDAGOGICAL GOALS:
- Communicate reasoning COMPLETELY and CONCISELY.
- Use correct mathematical language and symbols.
- If the question involves transformations (parameters a, k, d, c):
  - Be SPECIFIC about how 'a' affects vertical transformations and 'k' affects horizontal transformations.
  - Explain that for horizontal COMPRESSION, the value of |k| must be GREATER than 1.
  - Compare the parent function with the transformed function.

### SLIDE RULES (STRICT):
- Total slides: 4-6 ONLY.
- Each slide MUST contain 4-5 lines of content.
- Each line MUST be a complete, simple statement.
- CONCLUDING: You must only have ONE final/conclusion slide. Never use two summary or final slides.
- Formatting: Use '\\n' between every statement so they appear on separate lines.
- Math Formatting: Use LaTeX for ALL math expressions.
- DOUBLE ESCAPE BACKSLASHES: Because you are returning JSON, you MUST double-escape all LaTeX backslashes! For example, output '\\\\frac{1}{2}' instead of '\\frac{1}{2}', and '\\\\sin(x)' instead of '\\sin(x)'.
- FRACTIONS: Always use curly braces for fractions: '$\\\\frac{a}{b}$'. NEVER write '$\\\\frac12$'.
- IMPORTANT: Use $...$ delimiters for ALL math content to ensure professional rendering.
- Avoid plain text math like 'x/2 = 4'; use '$\\\\frac{x}{2} = 4$' instead. 
- VISUALS: Ensure a slide titled 'Visual Representation', 'Graph', or similar is used for the graph data.

### SCRIPT RULES (STRICT):
- The 'notes' (script) MUST match the slide content but use DIFFERENT words.
- LENGTH: Each slide script MUST be between 20 and 30 words total.
- FORMATTING: Every slide script MUST be a SINGLE, continuous paragraph. 
- SCRIPT CONTENT: NEVER use LaTeX in scripts; use plain English.

### OUTPUT FORMAT (STRICT JSON):
{
  "explanation": "Simple overview",
  "slides": [
    {
      "title": "Title",
      "content": "Statement one.\\nStatement two.",
      "notes": "Talking point for statement one.\\nTalking point for statement two."
    }
  ],
  "graphData": { 
    "type": "function | unit-circle | 3d | discrete | triangle", 
    "equation": "Equation or main formula", 
    "angle": 45, (only if type is 'unit-circle', in degrees)
    "shape": "pyramid | box | vectors", (only if type is '3d')
    "labels": [{ "x": 0, "y": 0, "text": "Label" }], (optional, for labeling vertices/points)
    "functions": [
      { "points": [{"x": 0, "y": 0}], "color": "#888888", "equation": "Parent function" },
      { "points": [{"x": 0, "y": 0}], "color": "#6366f1", "equation": "Transformed function" }
    ]
  }
}

### GRAPHING RULES:
- IMPORTANT FOR POINTS: The 'x' and 'y' values inside the 'points' array MUST be evaluated as valid JSON numbers (e.g. 0.5, -2.33). Calculate any fractions and output the decimal value. NEVER use strings, formulas, or LaTeX for coordinate values.
- You MUST provide at least 5 distinct coordinates per function to ensure it draws a proper line.
- CHARACTERISTICS / EXPONENTIAL / TRIG WAVES: Use 'function'. Generate 30-50 coordinates for x between -10 and 10. Compare parent vs transformed if applicable.
- TRIG RATIOS / ANGLES: Use 'unit-circle'. Provide the 'angle'.
- 3D TRIGONOMETRY: Use '3d'. Provide the 'shape'.
- SINE / COSINE LAW: Use 'triangle'. Provide 3 vertices in 'points' of the first function, and use 'labels' for angles/sides.
- DISCRETE FUNCTIONS (Sequences, Series, Finance): Use 'discrete'. Plot sequence terms (n vs value) using distinct points. Provide 'points' where x is the term number (n) and y is the value.`;

    const userPrompt = `Please solve this question: ${question.text}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Groq solving error:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
