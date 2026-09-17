export interface LessonProblem {
  id: string;
  title: string;
  expectation: string; // e.g. "C1.2", "B2.1"
  difficulty: number;
  prompt: string;
  preview: string;
  defaultSolution: {
    explanation: string;
    slides: {
      title: string;
      subtitle?: string;
      content: string;
      notes: string;
      type?: "intro" | "concept" | "derivation" | "graph" | "summary";
    }[];
    graphData?: {
      type: string;
      equation: string;
      isRadian?: boolean;
      asymptotes?: { type: "vertical" | "horizontal" | "oblique"; value: number | string; label?: string }[];
      holes?: { x: number; y: number }[];
      bounds?: { minX: number; maxX: number; minY: number; maxY: number };
      functions?: {
        mathjs: string;
        color?: string;
        equation?: string;
        points?: { x: number; y: number }[];
      }[];
      properties?: { name: string; value: string }[];
    };
  };
}

export interface CurriculumChapter {
  id: string;
  chapterNumber: number;
  title: string;
  shortTitle: string;
  code: string;
  description: string;
  overallExpectation: string;
  topics: string[];
  sampleProblems: LessonProblem[];
}

export const MHF4U_CURRICULUM: CurriculumChapter[] = [
  {
    id: "chapter-0",
    chapterNumber: 0,
    title: "Functions: Characteristics & Properties",
    shortTitle: "Functions & Properties",
    code: "D1/D2",
    description: "Domain and range, vertical line test, parent functions (piecewise and absolute value), geometric transformations, inverse functions, and operations on functions.",
    overallExpectation: "Demonstrate an understanding of function characteristics, combinations, and transformations.",
    topics: [
      "Real-Number Domains & Range",
      "Symmetry (Even vs. Odd Functions)",
      "Transformations: y = a·f(k(x - d)) + c",
      "Piecewise & Absolute Value Models",
      "Inverse Functions f⁻¹(x)",
      "Composite Functions f(g(x))"
    ],
    sampleProblems: [
      {
        id: "C0-P1",
        title: "Function Transformations & Inverses",
        expectation: "D1.1 / D2.1",
        difficulty: 4,
        prompt: "Given f(x) = 2*sqrt(-(x - 3)) + 1, identify the parent function, state the mapping rule, determine the domain and range, and find the inverse function f⁻¹(x).",
        preview: "f(x) = 2\\sqrt{-(x - 3)} + 1",
        defaultSolution: {
          explanation: "Analysis of radical function transformations and algebraic derivation of its inverse.",
          slides: [
            {
              title: "Problem Statement & Parent Function",
              subtitle: "MHF4U • Chapter 0: Function Characteristics",
              content: "Transformations of $f(x) = 2\\sqrt{-(x - 3)} + 1$\nParent function: $y = \\sqrt{x}$\nVertical stretch by factor $a = 2$\nHorizontal reflection across y-axis ($k = -1$)\nHorizontal shift right by $d = 3$ units\nVertical shift up by $c = 1$ unit",
              notes: "We begin by analyzing the transformed square root function. The base function is root x. Notice the parameters: a is 2, k is negative 1, d is 3, and c is 1.",
              type: "intro"
            },
            {
              title: "Mapping Rule & Domain / Range",
              subtitle: "Coordinate Transformation",
              content: "Mapping Rule: $(x, y) \\to (-x + 3,\\, 2y + 1)$\nDomain: $-(x - 3) \\ge 0 \\implies x \\le 3$\nInterval: $D = (-\\infty, 3]$\nRange: Since $\\sqrt{\\cdot} \\ge 0$, $y \\ge 1$\nInterval: $R = [1, \\infty)$",
              notes: "The mapping rule maps every point x, y to negative x plus 3, and 2 y plus 1. The radicand must be non-negative, giving domain x less than or equal to 3, and range y at least 1.",
              type: "concept"
            },
            {
              title: "Algebraic Derivation of Inverse f⁻¹(x)",
              subtitle: "Swapping Variables & Domain Restriction",
              content: "Swap variables: $x = 2\\sqrt{-(y - 3)} + 1$\nIsolate radical: $x - 1 = 2\\sqrt{-(y - 3)}$\nDivide by 2: $\\frac{x - 1}{2} = \\sqrt{-(y - 3)}$\nSquare both sides: $\\left(\\frac{x - 1}{2}\\right)^2 = -(y - 3)$\nResult: $f^{-1}(x) = -\\frac{1}{4}(x - 1)^2 + 3$, for $x \\ge 1$",
              notes: "To derive the inverse, swap x and y. Isolate the square root, divide by 2, square both sides, and solve for y. Remember to restrict the domain to x greater than or equal to 1.",
              type: "derivation"
            },
            {
              title: "Graphical Verification & Symmetry",
              subtitle: "Visualizing Parent, Transformed, & Inverse",
              content: "Parent $y = \\sqrt{x}$ shown in dotted gray\nTransformed $f(x) = 2\\sqrt{-(x - 3)} + 1$ shown in indigo\nEndpoint is at $(3, 1)$\nCurve opens to the left and upward",
              notes: "Examining the graph, we observe the starting vertex at 3 comma 1. As expected from the negative k value, the graph opens to the left.",
              type: "graph"
            },
            {
              title: "Key Takeaways & Summary",
              subtitle: "Core Principles",
              content: "A horizontal reflection ($k < 0$) inverts the domain direction.\nThe inverse function inherits its domain from the original range: $D_{f^{-1}} = R_f = [1, \\infty)$.\nAlways verify endpoints: $f(3) = 1 \\iff f^{-1}(1) = 3$.",
              notes: "In summary, horizontal reflections flip domain orientation. The inverse function domain always strictly equals the original range, maintaining mathematical consistency.",
              type: "summary"
            }
          ],
          graphData: {
            type: "function",
            equation: "f(x) = 2\\sqrt{-(x - 3)} + 1",
            bounds: { minX: -6, maxX: 6, minY: -1, maxY: 7 },
            functions: [
              { mathjs: "2 * sqrt(max(0, -(x - 3)))", color: "#6366f1", equation: "f(x) = 2\\sqrt{-(x - 3)} + 1" },
              { mathjs: "sqrt(max(0, x))", color: "#64748b", equation: "y = \\sqrt{x} \\text{ (Parent)}" }
            ],
            properties: [
              { name: "Endpoint", value: "(3, 1)" },
              { name: "Domain", value: "(-\\infty, 3]" },
              { name: "Range", value: "[1, \\infty)" },
              { name: "Inverse Domain", value: "[1, \\infty)" }
            ]
          }
        }
      }
    ]
  },
  {
    id: "chapter-1",
    chapterNumber: 1,
    title: "Polynomial Functions & Rates of Change",
    shortTitle: "Polynomials & Rates of Change",
    code: "C1/D1",
    description: "Key features of cubic and quartic polynomials, factored form, turning points, end behavior, and connecting average and instantaneous rates of change to secant and tangent slopes.",
    overallExpectation: "Identify key features of polynomial functions and determine average and instantaneous rates of change.",
    topics: [
      "Power Functions & End Behavior",
      "Cubic & Quartic Parent Transformations",
      "Multiplicity of Zeros (Linear, Quadratic, Cubic)",
      "Average Rate of Change (Secant Line)",
      "Instantaneous Rate of Change (Difference Quotient)",
      "Real-World Optimization Models"
    ],
    sampleProblems: [
      {
        id: "C1-P1",
        title: "Instantaneous Rate of Change on a Cubic",
        expectation: "C1.1 / D1.1",
        difficulty: 5,
        prompt: "For the polynomial f(x) = -x^3 + 3x^2 + 1, calculate the average rate of change on [1, 2], estimate the instantaneous rate of change at x = 1 using the difference quotient with h = 0.001, and interpret geometrically.",
        preview: "f(x) = -x^3 + 3x^2 + 1 \\text{ at } x = 1",
        defaultSolution: {
          explanation: "Rigorous computation of average and instantaneous rates of change for a degree 3 polynomial.",
          slides: [
            {
              title: "Polynomial Analysis & Rate of Change",
              subtitle: "MHF4U • Chapter 1: Rates of Change",
              content: "Function: $f(x) = -x^3 + 3x^2 + 1$\nDegree 3 (Cubic), Leading Coefficient $a_n = -1 < 0$\nEnd Behavior: As $x \\to -\\infty, y \\to \\infty$; As $x \\to \\infty, y \\to -\\infty$ (Quadrant II to IV)\nTarget interval: $[1, 2]$ for average rate\nTarget point: $x = 1$ for instantaneous rate (tangent slope)",
              notes: "We evaluate rates of change for this cubic function. Notice the negative leading coefficient, meaning the graph begins high in quadrant 2 and exits low in quadrant 4.",
              type: "intro"
            },
            {
              title: "Average Rate of Change (Secant Slope)",
              subtitle: "Interval [1, 2]",
              content: "Formula: $\\text{AROC} = \\frac{f(b) - f(a)}{b - a}$\nEvaluate at $x = 1$: $f(1) = -(1)^3 + 3(1)^2 + 1 = 3$\nEvaluate at $x = 2$: $f(2) = -(2)^3 + 3(2)^2 + 1 = -8 + 12 + 1 = 5$\nCalculate: $\\text{AROC} = \\frac{5 - 3}{2 - 1} = \\frac{2}{1} = 2$\nInterpretation: The secant line connecting $(1, 3)$ and $(2, 5)$ has slope $m = 2$.",
              notes: "The average rate of change formula gives the slope of the secant line. Computing f of 2 minus f of 1 over 2 minus 1 yields an average rate of positive 2.",
              type: "concept"
            },
            {
              title: "Instantaneous Rate of Change (Difference Quotient)",
              subtitle: "Tangent Slope at x = 1",
              content: "Formula: $\\text{IROC} = \\lim_{h \\to 0} \\frac{f(a + h) - f(a)}{h}$\nSet $a = 1$: $f(1 + h) = -(1 + h)^3 + 3(1 + h)^2 + 1$\nExpand: $-(1 + 3h + 3h^2 + h^3) + 3(1 + 2h + h^2) + 1$\nSimplify: $3 + 3h - h^3$\nDifference quotient: $\\frac{(3 + 3h - h^3) - 3}{h} = \\frac{3h - h^3}{h} = 3 - h^2$\nTake limit as $h \\to 0$: $\\text{IROC} = 3$",
              notes: "For instantaneous rate of change at x equals 1, we set up the difference quotient. Expanding and simplifying cancels the constant terms, giving 3 minus h squared, which approaches 3.",
              type: "derivation"
            },
            {
              title: "Graphical Verification: Secant vs. Tangent",
              subtitle: "Geometric Comparison at x = 1",
              content: "Cubic curve: $y = -x^3 + 3x^2 + 1$\nTangent line at $(1, 3)$: $y = 3(x - 1) + 3 = 3x$\nSecant line through $(1, 3)$ and $(2, 5)$: $y = 2x + 1$\nLocal maximum occurs at $x = 2$ where slope becomes $0$",
              notes: "Graphically, the tangent line with slope 3 hugs the curve closely at 1 comma 3. Notice the secant line has a slightly flatter slope of 2 across the interval.",
              type: "graph"
            },
            {
              title: "Pedagogical Takeaway",
              subtitle: "Calculus Readiness",
              content: "Average rate represents the overall rate over a finite span.\nInstantaneous rate represents the true velocity or instantaneous growth at a single point.\nAs the interval width $h \\to 0$, secant lines converge precisely to the tangent line.",
              notes: "This directly bridges Advanced Functions to Calculus. As the interval width shrinks to zero, secant lines converge directly onto the unique tangent line.",
              type: "summary"
            }
          ],
          graphData: {
            type: "function",
            equation: "f(x) = -x^3 + 3x^2 + 1",
            bounds: { minX: -1, maxX: 4, minY: -2, maxY: 7 },
            functions: [
              { mathjs: "-x^3 + 3*x^2 + 1", color: "#6366f1", equation: "f(x) = -x^3 + 3x^2 + 1" },
              { mathjs: "3*x", color: "#10b981", equation: "y = 3x \\text{ (Tangent at } x=1\\text{)}" },
              { mathjs: "2*x + 1", color: "#f59e0b", equation: "y = 2x + 1 \\text{ (Secant on } [1,2]\\text{)}" }
            ],
            properties: [
              { name: "Tangent Slope (IROC)", value: "3" },
              { name: "Secant Slope (AROC)", value: "2" },
              { name: "Point of Tangency", value: "(1, 3)" },
              { name: "Local Max", value: "(2, 5)" }
            ]
          }
        }
      }
    ]
  },
  {
    id: "chapter-2",
    chapterNumber: 2,
    title: "Polynomial Equations & Inequalities",
    shortTitle: "Equations & Inequalities",
    code: "C3/C4",
    description: "Polynomial long division, Remainder Theorem, Factor Theorem, factoring degree 3 and 4 polynomials, determining function families, and solving factorable inequalities using sign charts and number lines.",
    overallExpectation: "Solve polynomial equations and factorable inequalities algebraically and graphically.",
    topics: [
      "Polynomial Long Division & Synthetic Division",
      "Remainder Theorem: P(b/a) = Remainder",
      "Factor Theorem: (ax - b) is a factor iff P(b/a) = 0",
      "Factoring Sum & Difference of Cubes",
      "Sign Charts & Interval Notation",
      "Polynomial Families: y = k(x - r₁)(x - r₂)..."
    ],
    sampleProblems: [
      {
        id: "C2-P1",
        title: "Solving Higher-Degree Polynomial Inequality",
        expectation: "C4.1 / C4.2",
        difficulty: 6,
        prompt: "Solve the polynomial inequality 2x^3 - 3x^2 - 11x + 6 >= 0 algebraically using the Factor Theorem, synthetic division, and a sign table. State your solution in interval notation.",
        preview: "2x^3 - 3x^2 - 11x + 6 \\ge 0",
        defaultSolution: {
          explanation: "Step-by-step factorization using Rational Root Theorem and solution via rigorous sign chart analysis.",
          slides: [
            {
              title: "Polynomial Inequality Setup",
              subtitle: "MHF4U • Chapter 2: Polynomial Inequalities",
              content: "Solve: $P(x) = 2x^3 - 3x^2 - 11x + 6 \\ge 0$\nPossible rational roots $\\pm \\frac{p}{q} \\in \\left\\{\\pm 1, \\pm 2, \\pm 3, \\pm 6, \\pm \\frac{1}{2}, \\pm \\frac{3}{2}\\right\\}$\nTest $x = -2$:\n$P(-2) = 2(-8) - 3(4) - 11(-2) + 6 = -16 - 12 + 22 + 6 = 0$\nBy Factor Theorem, $(x + 2)$ is a factor of $P(x)$.",
              notes: "We are solving a cubic inequality greater than or equal to zero. Using the rational root theorem, testing negative 2 yields zero, proving x plus 2 is an exact factor.",
              type: "intro"
            },
            {
              title: "Polynomial Division & Complete Factoring",
              subtitle: "Synthetic Division by (x + 2)",
              content: "Division coefficients: $[2, -3, -11, 6]$ divided by $-2$\nQuotient: $2x^2 - 7x + 3$\nFactor the quadratic quotient:\n$2x^2 - 6x - x + 3 = 2x(x - 3) - 1(x - 3) = (2x - 1)(x - 3)$\nComplete Factored Form:\n$P(x) = (x + 2)(2x - 1)(x - 3) \\ge 0$\nReal Zeros (Critical Values): $x = -2,\\, \\frac{1}{2},\\, 3$",
              notes: "Dividing by x plus 2 produces the quadratic 2 x squared minus 7 x plus 3. Factoring this quadratic gives 2 x minus 1 and x minus 3. Our critical values are negative 2, 1 half, and 3.",
              type: "derivation"
            },
            {
              title: "Sign Table & Interval Analysis",
              subtitle: "Evaluating Sign Changes Across Roots",
              content: "Intervals: $(-\\infty, -2)$, $(-2, \\frac{1}{2})$, $(\\frac{1}{2}, 3)$, $(3, \\infty)$\nTest $x = -3$: $(-)(-)(-) = - < 0$\nTest $x = 0$: $(+)(-)(-) = + > 0$  ✓\nTest $x = 1$: $(+)(+)(-) = - < 0$\nTest $x = 4$: $(+)(+)(+) = + > 0$  ✓\nNon-strict inequality includes zeros: $x \\in [-2, \\frac{1}{2}] \\cup [3, \\infty)$",
              notes: "We construct four test intervals partitioned by the roots. Testing values shows positive regions between negative 2 and 1 half, and from 3 to infinity, inclusive of boundaries.",
              type: "concept"
            },
            {
              title: "Graphical Interpretation",
              subtitle: "Regions Above or On the x-axis",
              content: "Cubic curve $y = 2x^3 - 3x^2 - 11x + 6$\nx-intercepts at $(-2, 0)$, $(0.5, 0)$, and $(3, 0)$\ny-intercept at $(0, 6)$\nHighlighted positive region: $[-2, 0.5]$ and $[3, \\infty)$",
              notes: "On the coordinate plane, the graph crosses the x-axis at negative 2, positive 0.5, and 3. The solution intervals correspond precisely to where the curve sits on or above the axis.",
              type: "graph"
            },
            {
              title: "Summary & Interval Notation",
              subtitle: "Final Mathematical Statement",
              content: "Solution set: $\\{x \\in \\mathbb{R} \\mid -2 \\le x \\le \\frac{1}{2} \\text{ or } x \\ge 3\\}$\nInterval notation: $x \\in [-2,\\, 0.5] \\cup [3,\\, \\infty)$\nCheck boundary conditions: Square brackets $[\\dots]$ required due to '$\\ge 0$'.",
              notes: "In conclusion, our solution in interval notation is negative 2 to 0.5 union 3 to infinity. Ensure square brackets are used because the inequality allows zero.",
              type: "summary"
            }
          ],
          graphData: {
            type: "function",
            equation: "y = 2x^3 - 3x^2 - 11x + 6",
            bounds: { minX: -4, maxX: 5, minY: -20, maxY: 20 },
            functions: [
              { mathjs: "2*x^3 - 3*x^2 - 11*x + 6", color: "#6366f1", equation: "y = 2x^3 - 3x^2 - 11x + 6" },
              { mathjs: "0", color: "#64748b", equation: "y = 0 \\text{ (x-axis)}" }
            ],
            properties: [
              { name: "Roots", value: "x = -2, 0.5, 3" },
              { name: "y-intercept", value: "(0, 6)" },
              { name: "Solution Set", value: "[-2, 0.5] \\cup [3, \\infty)" }
            ]
          }
        }
      }
    ]
  },
  {
    id: "chapter-3",
    chapterNumber: 3,
    title: "Rational Functions & Discontinuities",
    shortTitle: "Rational Functions",
    code: "C2/C3",
    description: "Reciprocal linear and quadratic functions, rational functions of the form f(x) = (ax + b)/(cx + d), vertical and horizontal asymptotes, holes (removable discontinuities), and solving rational equations and inequalities.",
    overallExpectation: "Identify key features of rational functions and represent them graphically and algebraically.",
    topics: [
      "Reciprocal Functions: f(x) = 1/g(x)",
      "Linear Rational: f(x) = (ax + b)/(cx + d)",
      "Vertical Asymptotes & Non-Permissible Values",
      "Horizontal Asymptotes: Comparing Degrees",
      "Holes (Removable Discontinuities)",
      "Rational Inequalities with Sign Tables"
    ],
    sampleProblems: [
      {
        id: "C3-P1",
        title: "Analyzing & Graphing a Rational Function",
        expectation: "C2.1 / C2.2",
        difficulty: 5,
        prompt: "Analyze f(x) = (2x - 4)/(x + 1). State its domain, range, intercepts, vertical asymptote, horizontal asymptote, and behavior near the asymptotes. Sketch the graph.",
        preview: "f(x) = \\frac{2x - 4}{x + 1}",
        defaultSolution: {
          explanation: "Full asymptotic and graphical breakdown of a linear rational function.",
          slides: [
            {
              title: "Rational Function Properties",
              subtitle: "MHF4U • Chapter 3: Rational Functions",
              content: "Rational Function: $f(x) = \\frac{2x - 4}{x + 1} = \\frac{2(x - 2)}{x + 1}$\nNon-permissible value: $x + 1 = 0 \\implies x = -1$\nDomain: $\\{x \\in \\mathbb{R} \\mid x \\ne -1\\}$\nFactored numerator gives zero at $x = 2$\nNo common factors between numerator and denominator $\\implies$ No holes.",
              notes: "We analyze the rational function 2x minus 4 over x plus 1. The denominator is zero when x equals negative 1, establishing our non-permissible value and domain restriction.",
              type: "intro"
            },
            {
              title: "Asymptote Derivation",
              subtitle: "Vertical & Horizontal Limits",
              content: "Vertical Asymptote: $x = -1$\nBehavior as $x \\to -1^-$: $\\frac{2(-1) - 4}{(-1^-) + 1} = \\frac{-6}{0^-} = +\\infty$\nBehavior as $x \\to -1^+$: $\\frac{-6}{0^+} = -\\infty$\nHorizontal Asymptote: Degree ratio $\\frac{2x}{x} = 2 \\implies y = 2$\nRange: $\\{y \\in \\mathbb{R} \\mid y \\ne 2\\}$",
              notes: "The vertical asymptote is x equals negative 1. Approaching from the left goes to positive infinity; from the right, negative infinity. The ratio of leading coefficients gives horizontal asymptote y equals 2.",
              type: "concept"
            },
            {
              title: "Key Coordinate Points & Intercepts",
              subtitle: "Exact Values",
              content: "x-intercept: Set $f(x) = 0 \\implies 2x - 4 = 0 \\implies (2, 0)$\ny-intercept: Set $x = 0 \\implies f(0) = \\frac{2(0) - 4}{0 + 1} = -4 \\implies (0, -4)$\nSign pattern: Negative for $x \\in (-1, 2)$, Positive for $x \\in (-\\infty, -1) \\cup (2, \\infty)$\nBoth branches form a smooth hyperbola rotated and translated.",
              notes: "Setting the numerator to zero gives an x-intercept at 2 comma 0. Setting x to zero gives a y-intercept at 0 comma negative 4, verifying our two hyperbolic branches.",
              type: "derivation"
            },
            {
              title: "Graphical Display & Asymptotes",
              subtitle: "Two Hyperbolic Branches",
              content: "Vertical Asymptote $x = -1$ (dashed line)\nHorizontal Asymptote $y = 2$ (dashed line)\nBranch 1: In upper-left quadrant, bounded by $x < -1$ and $y > 2$\nBranch 2: In lower-right quadrant, passing through $(0, -4)$ and $(2, 0)$",
              notes: "The graph clearly illustrates the two hyperbolic branches separated by the vertical asymptote at x equals negative 1 and horizontal asymptote at y equals 2.",
              type: "graph"
            },
            {
              title: "Summary & Function Behavior",
              subtitle: "Core Principles",
              content: "Linear rational functions $f(x) = \\frac{ax+b}{cx+d}$ have $VA: x = -d/c$ and $HA: y = a/c$.\nThe function is strictly increasing on both disjoint intervals $(-\\infty, -1)$ and $(-1, \\infty)$.\nNever connect points across a vertical asymptote.",
              notes: "To conclude, linear rational functions produce hyperbolas with two asymptotes. Remember to never connect points across the vertical asymptote singularity.",
              type: "summary"
            }
          ],
          graphData: {
            type: "function",
            equation: "f(x) = \\frac{2x - 4}{x + 1}",
            bounds: { minX: -8, maxX: 6, minY: -8, maxY: 10 },
            asymptotes: [
              { type: "vertical", value: -1, label: "x = -1" },
              { type: "horizontal", value: 2, label: "y = 2" }
            ],
            functions: [
              { mathjs: "(2*x - 4)/(x + 1)", color: "#6366f1", equation: "f(x) = \\frac{2x - 4}{x + 1}" }
            ],
            properties: [
              { name: "Vertical Asymptote", value: "x = -1" },
              { name: "Horizontal Asymptote", value: "y = 2" },
              { name: "x-intercept", value: "(2, 0)" },
              { name: "y-intercept", value: "(0, -4)" }
            ]
          }
        }
      }
    ]
  },
  {
    id: "chapter-4",
    chapterNumber: 4,
    title: "Trigonometry: Radian Measure & Identities",
    shortTitle: "Radian Trig & Identities",
    code: "B1/B3",
    description: "Radian measure, arc length, unit circle coordinates, exact values of primary and reciprocal trigonometric ratios for special angles up to 2π, compound angle formulas, and algebraic proofs of trigonometric identities.",
    overallExpectation: "Demonstrate an understanding of radian measure and solve problems involving trigonometric equations and identities.",
    topics: [
      "Radian Measure & Arc Length: s = r·θ",
      "Special Angles: π/6, π/4, π/3, π/2",
      "Primary & Reciprocal Ratios: csc, sec, cot",
      "Compound Angle Formulas: sin(A ± B), cos(A ± B)",
      "Double Angle Formulas: sin(2θ), cos(2θ)",
      "Proving Trigonometric Identities (LS = RS)"
    ],
    sampleProblems: [
      {
        id: "C4-P1",
        title: "Exact Special Angles & Compound Angle Formula",
        expectation: "B1.2 / B3.2",
        difficulty: 5,
        prompt: "Evaluate the exact value of cos(7π/12) without technology using compound angle formulas. Verify on the unit circle.",
        preview: "\\cos\\left(\\frac{7\\pi}{12}\\right)",
        defaultSolution: {
          explanation: "Exact calculation of non-standard radian angle using sum of special angles.",
          slides: [
            {
              title: "Angle Decomposition in Radians",
              subtitle: "MHF4U • Chapter 4: Trigonometric Formulas",
              content: "Goal: Evaluate exact value of $\\cos\\left(\\frac{7\\pi}{12}\\right)$\nNotice that $\\frac{7\\pi}{12}$ can be split into familiar special angles:\n$\\frac{7\\pi}{12} = \\frac{3\\pi}{12} + \\frac{4\\pi}{12} = \\frac{\\pi}{4} + \\frac{\\pi}{3}$\nBoth $\\frac{\\pi}{4}$ ($45^\\circ$) and $\\frac{\\pi}{3}$ ($60^\\circ$) have known exact trigonometric ratios.",
              notes: "We evaluate cosine of 7 pi over 12. Decomposing 7 twelfths into 3 twelfths plus 4 twelfths reveals the familiar special angles pi over 4 and pi over 3.",
              type: "intro"
            },
            {
              title: "Compound Angle Identity for Cosine",
              subtitle: "cos(A + B) = cos(A)cos(B) - sin(A)sin(B)",
              content: "Recall the cosine addition formula:\n$\\cos(A + B) = \\cos(A)\\cos(B) - \\sin(A)\\sin(B)$\nSubstitute $A = \\frac{\\pi}{4}$ and $B = \\frac{\\pi}{3}$:\n$\\cos\\left(\\frac{\\pi}{4} + \\frac{\\pi}{3}\\right) = \\cos\\left(\\frac{\\pi}{4}\\right)\\cos\\left(\\frac{\\pi}{3}\\right) - \\sin\\left(\\frac{\\pi}{4}\\right)\\sin\\left(\\frac{\\pi}{3}\\right)$",
              notes: "We apply the compound angle formula for cosine of A plus B, which equals cos A cos B minus sin A sin B. Watch the minus sign carefully.",
              type: "concept"
            },
            {
              title: "Exact Value Substitution & Arithmetic",
              subtitle: "Unit Circle Special Values",
              content: "Special angle values:\n$\\cos(\\pi/4) = \\frac{\\sqrt{2}}{2},\\quad \\sin(\\pi/4) = \\frac{\\sqrt{2}}{2}$\n$\\cos(\\pi/3) = \\frac{1}{2},\\quad \\sin(\\pi/3) = \\frac{\\sqrt{3}}{2}$\nMultiply:\n$= \\left(\\frac{\\sqrt{2}}{2}\\right)\\left(\\frac{1}{2}\\right) - \\left(\\frac{\\sqrt{2}}{2}\\right)\\left(\\frac{\\sqrt{3}}{2}\\right)$\n$= \\frac{\\sqrt{2} - \\sqrt{6}}{4}$",
              notes: "Substituting exact values from the special triangles: root 2 over 2 times one half minus root 2 over 2 times root 3 over 2 yields root 2 minus root 6, all over 4.",
              type: "derivation"
            },
            {
              title: "Unit Circle Verification",
              subtitle: "Quadrant II Position",
              content: "Angle $\\theta = \\frac{7\\pi}{12} = 105^\\circ$ lies in Quadrant II\nIn Quadrant II, cosine must be negative: $\\cos(\\theta) < 0$\nCheck sign of exact result:\n$\\sqrt{2} \\approx 1.414,\\, \\sqrt{6} \\approx 2.449 \\implies \\frac{1.414 - 2.449}{4} \\approx -0.2588$\nExact result is negative, confirming position in Quadrant II.",
              notes: "Since 7 pi over 12 is 105 degrees, it resides in quadrant 2 where cosine is strictly negative. Our result root 2 minus root 6 is negative 0.2588, perfectly matching.",
              type: "graph"
            },
            {
              title: "Summary & Memory Rule",
              subtitle: "Key Takeaways",
              content: "Exact value: $\\cos(7\\pi/12) = \\frac{\\sqrt{2} - \\sqrt{6}}{4}$\nRemember: $\\cos(A + B)$ changes sign to negative: $\\cos A \\cos B - \\sin A \\sin B$.\nCommon decompositions: $\\frac{\\pi}{12} = \\frac{\\pi}{3} - \\frac{\\pi}{4}$ and $\\frac{5\\pi}{12} = \\frac{\\pi}{6} + \\frac{\\pi}{4}$.",
              notes: "Remember that the compound cosine formula switches signs to negative. Master the 12th radian fractions as sums and differences of quarters, thirds, and sixths.",
              type: "summary"
            }
          ],
          graphData: {
            type: "unit-circle",
            equation: "\\cos(7\\pi/12) = \\frac{\\sqrt{2} - \\sqrt{6}}{4}",
            bounds: { minX: -1.5, maxX: 1.5, minY: -1.5, maxY: 1.5 },
            functions: [
              { mathjs: "cos(t), sin(t)", color: "#6366f1", equation: "x^2 + y^2 = 1" }
            ],
            properties: [
              { name: "Angle θ", value: "7\\pi/12 \\; (105^\\circ)" },
              { name: "cos(θ)", value: "\\frac{\\sqrt{2}-\\sqrt{6}}{4} \\approx -0.259" },
              { name: "sin(θ)", value: "\\frac{\\sqrt{2}+\\sqrt{6}}{4} \\approx 0.966" },
              { name: "Quadrant", value: "Quadrant II" }
            ]
          }
        }
      }
    ]
  },
  {
    id: "chapter-5",
    chapterNumber: 5,
    title: "Trigonometric Functions & Sinusoidal Modeling",
    shortTitle: "Trig Functions & Models",
    code: "B2/B3",
    description: "Graphical analysis and transformations of sinusoidal functions f(x) = a·sin[k(x - d)] + c, determining amplitude, period (2π/k), phase shift, and vertical translation, and solving trigonometric equations on [0, 2π].",
    overallExpectation: "Make connections between trigonometric ratios and graphical/algebraic representations of trigonometric functions, and model real-world scenarios.",
    topics: [
      "Base Graphs: sin(x), cos(x), tan(x) in Radians",
      "Transformations: y = a·sin[k(x - d)] + c",
      "Period T = 2π/k, Amplitude = |a|, Phase Shift = d",
      "Solving Linear Trig Equations on [0, 2π]",
      "Solving Quadratic Trig Equations (Factoring)",
      "Real-World Harmonic Models (Tides, Ferris Wheels)"
    ],
    sampleProblems: [
      {
        id: "C5-P1",
        title: "Sinusoidal Transformation & Key Features",
        expectation: "B2.2 / B3.1",
        difficulty: 5,
        prompt: "For the sinusoidal function f(x) = 3*cos(2(x - pi/4)) + 1, state the amplitude, period, phase shift, equation of the axis, and range. Find all x-intercepts on the domain [0, 2pi].",
        preview: "f(x) = 3\\cos\\left(2\\left(x - \\frac{\\pi}{4}\\right)\\right) + 1",
        defaultSolution: {
          explanation: "Complete parameter extraction and exact solution of sinusoidal equation on [0, 2pi].",
          slides: [
            {
              title: "Sinusoidal Parameter Extraction",
              subtitle: "MHF4U • Chapter 5: Trigonometric Functions",
              content: "Function: $f(x) = 3\\cos\\left(2\\left(x - \\frac{\\pi}{4}\\right)\\right) + 1$\nCompare to standard form $y = a\\cos[k(x - d)] + c$:\nAmplitude: $|a| = |3| = 3$\nk-value: $k = 2 \\implies \\text{Period } T = \\frac{2\\pi}{k} = \\frac{2\\pi}{2} = \\pi$\nPhase shift: $d = +\\frac{\\pi}{4}$ (shifted right by $\\frac{\\pi}{4}$)\nVertical shift: $c = +1$ (Axis of curve: $y = 1$)",
              notes: "We examine the transformed cosine wave. Identifying parameters gives an amplitude of 3, a period of pi due to k equals 2, a phase shift of pi over 4 to the right, and an axis of curve at y equals 1.",
              type: "intro"
            },
            {
              title: "Range & Critical Maximum / Minimum Values",
              subtitle: "Vertical Bounding",
              content: "Maximum value: $c + |a| = 1 + 3 = 4$\nMinimum value: $c - |a| = 1 - 3 = -2$\nRange: $\\{y \\in \\mathbb{R} \\mid -2 \\le y \\le 4\\}$\nOne full cycle completes every $\\pi$ radians.\nCritical point interval: $\\frac{T}{4} = \\frac{\\pi}{4}$",
              notes: "The maximum value is 1 plus 3, which is 4. The minimum is 1 minus 3, which is negative 2. One complete wave cycle spans pi radians, with key points occurring every pi over 4.",
              type: "concept"
            },
            {
              title: "Solving for x-Intercepts on [0, 2π]",
              subtitle: "Exact Algebraic Solution",
              content: "Set $f(x) = 0 \\implies 3\\cos\\left(2\\left(x - \\frac{\\pi}{4}\\right)\\right) + 1 = 0$\nIsolate cosine: $\\cos\\left(2\\left(x - \\frac{\\pi}{4}\\right)\\right) = -\\frac{1}{3}$\nLet $\\theta = 2(x - \\pi/4)$. Reference angle: $\\theta_r = \\arccos(1/3) \\approx 1.231$ rad\nIn Quadrants II and III:\n$\\theta_1 = \\pi - 1.231 \\approx 1.911,\\quad \\theta_2 = \\pi + 1.231 \\approx 4.372$\nSolving for $x$: $x = \\frac{\\theta}{2} + \\frac{\\pi}{4} \\implies x_1 \\approx 1.741,\\, x_2 \\approx 2.971$\nAdding period $\\pi$: $x_3 \\approx 4.882,\\, x_4 \\approx 6.113$",
              notes: "To solve for zeros, set the function to 0 and isolate cosine to negative 1 third. Using reference angles across quadrants 2 and 3 yields four distinct roots on 0 to 2 pi.",
              type: "derivation"
            },
            {
              title: "Graphical Display with π Radian Scaling",
              subtitle: "Two Complete Cycles on [0, 2π]",
              content: "Domain displayed: $[0, 2\\pi]$\nAxis of curve: $y = 1$ (dashed center line)\nPeak at $x = \\frac{\\pi}{4} \\approx 0.785$ with $y = 4$\nTrough at $x = \\frac{3\\pi}{4} \\approx 2.356$ with $y = -2$\nTwo complete waves visible over $[0, 2\\pi]$",
              notes: "The graph clearly demonstrates two complete sinusoidal oscillations over 0 to 2 pi. The wave oscillates around the dashed midline at y equals 1 between negative 2 and positive 4.",
              type: "graph"
            },
            {
              title: "Summary & Modelling Applications",
              subtitle: "Key Takeaways",
              content: "Period is governed exclusively by $k$: $T = \\frac{2\\pi}{k}$.\nHorizontal compression by factor $1/k$ doubles the wave frequency when $k = 2$.\nThis model represents periodic harmonic phenomena such as tidal depths or oscillating pendulums.",
              notes: "In summary, k directly determines the period and frequency. Sinusoidal models like this are the mathematical foundation for real-world harmonic motion and tidal forecasting.",
              type: "summary"
            }
          ],
          graphData: {
            type: "function",
            equation: "f(x) = 3\\cos(2(x - \\pi/4)) + 1",
            isRadian: true,
            bounds: { minX: 0, maxX: 6.283, minY: -3, maxY: 5 },
            functions: [
              { mathjs: "3*cos(2*(x - 0.7854)) + 1", color: "#6366f1", equation: "f(x) = 3\\cos(2(x - \\pi/4)) + 1" },
              { mathjs: "1", color: "#64748b", equation: "y = 1 \\text{ (Axis of Curve)}" }
            ],
            properties: [
              { name: "Amplitude", value: "3" },
              { name: "Period", value: "\\pi \\approx 3.14" },
              { name: "Phase Shift", value: "\\pi/4 \\text{ right}" },
              { name: "Axis of Curve", value: "y = 1" }
            ]
          }
        }
      }
    ]
  },
  {
    id: "chapter-6",
    chapterNumber: 6,
    title: "Exponential & Logarithmic Functions",
    shortTitle: "Exponential & Logarithms",
    code: "A1/A2/A3",
    description: "Inverse relationship between exponential and logarithmic functions, evaluating logs, logarithmic laws (product, quotient, power, change of base), solving exponential and logarithmic equations, and real-world models (Richter, pH, sound decibels, half-life).",
    overallExpectation: "Demonstrate an understanding of exponential and logarithmic relationships and apply the laws of logarithms to solve real-world problems.",
    topics: [
      "Logarithm Definition: y = log_b(x) <=> b^y = x",
      "Laws of Logs: Product, Quotient, Power",
      "Change of Base: log_b(x) = ln(x) / ln(b)",
      "Transformations of Log Graphs: VA at x = d",
      "Solving Exponential Equations using Logarithms",
      "Solving Log Equations & Checking Extraneous Roots",
      "Applications: pH Scale, Richter Magnitude, Decibels"
    ],
    sampleProblems: [
      {
        id: "C6-P1",
        title: "Solving Logarithmic Equation with Extraneous Roots",
        expectation: "A3.1 / A3.2",
        difficulty: 6,
        prompt: "Solve log_2(x + 3) + log_2(x - 1) = 5 algebraically. Check for extraneous roots and interpret on the graph.",
        preview: "\\log_2(x + 3) + \\log_2(x - 1) = 5",
        defaultSolution: {
          explanation: "Application of logarithmic product law and rigorous verification of domain restrictions to reject extraneous roots.",
          slides: [
            {
              title: "Logarithmic Equation & Domain Constraints",
              subtitle: "MHF4U • Chapter 6: Logarithmic Equations",
              content: "Equation: $\\log_2(x + 3) + \\log_2(x - 1) = 5$\nDomain Restrictions:\nArgument 1: $x + 3 > 0 \\implies x > -3$\nArgument 2: $x - 1 > 0 \\implies x > 1$\nCombined Domain: $x > 1$\nAny solution $x \\le 1$ is an extraneous root and must be rejected.",
              notes: "We solve a logarithmic equation with base 2. First, determine domain restrictions: both logarithmic arguments must be strictly positive, establishing that x must be greater than 1.",
              type: "intro"
            },
            {
              title: "Applying the Product Law of Logarithms",
              subtitle: "log_b(A) + log_b(B) = log_b(A·B)",
              content: "Combine into a single logarithm:\n$\\log_2((x + 3)(x - 1)) = 5$\nConvert to equivalent exponential form ($y = \\log_b(M) \\iff b^y = M$):\n$(x + 3)(x - 1) = 2^5$\nExpand and evaluate $2^5 = 32$:\n$x^2 + 2x - 3 = 32$",
              notes: "Using the product law of logarithms, we combine the terms into log base 2 of x plus 3 times x minus 1. Converting to exponential form yields x plus 3 times x minus 1 equals 2 to the 5th, or 32.",
              type: "concept"
            },
            {
              title: "Solving the Quadratic & Testing Roots",
              subtitle: "Factoring & Extraneous Verification",
              content: "Rearrange to standard form:\n$x^2 + 2x - 35 = 0$\nFactor the quadratic:\n$(x + 7)(x - 5) = 0 \\implies x = -7 \\text{ or } x = 5$\nVerification against domain $x > 1$:\n• Test $x = -7$: $\\log_2(-7-1) = \\log_2(-8)$ (Undefined! Rejected as extraneous)\n• Test $x = 5$: $\\log_2(8) + \\log_2(4) = 3 + 2 = 5$  ✓ (Valid solution)\nUnique valid solution: $x = 5$",
              notes: "Rearranging produces x squared plus 2x minus 35 equals 0, which factors to x plus 7 and x minus 5. Negative 7 produces an undefined negative logarithm and is rejected. Therefore, x equals 5 is the sole solution.",
              type: "derivation"
            },
            {
              title: "Graphical Interpretation",
              subtitle: "Intersection at y = 5",
              content: "Curve $y = \\log_2(x + 3) + \\log_2(x - 1)$\nVertical asymptote at $x = 1$\nHorizontal line $y = 5$\nSingle point of intersection occurs precisely at $(5, 5)$\nNo graph exists to the left of $x = 1$",
              notes: "Graphically, the left-hand curve exists only for x greater than 1 with a vertical asymptote at x equals 1. It crosses the horizontal line y equals 5 exactly at the point 5 comma 5.",
              type: "graph"
            },
            {
              title: "Summary & Pedagogical Rules",
              subtitle: "Key Takeaways",
              content: "Always determine the domain restriction before solving logarithmic equations.\nConverting to exponential form can introduce algebraic roots that are outside the logarithmic domain.\nAlways substitute potential roots back into the original arguments.",
              notes: "Always define the logarithmic domain first. Quadratic steps can create extraneous roots that must be tested and discarded. The true solution is strictly x equals 5.",
              type: "summary"
            }
          ],
          graphData: {
            type: "function",
            equation: "\\log_2(x + 3) + \\log_2(x - 1) = 5",
            bounds: { minX: 0, maxX: 8, minY: -2, maxY: 7 },
            asymptotes: [
              { type: "vertical", value: 1, label: "x = 1" }
            ],
            functions: [
              { mathjs: "log(max(0.001, x + 3))/log(2) + log(max(0.001, x - 1))/log(2)", color: "#6366f1", equation: "y = \\log_2(x+3) + \\log_2(x-1)" },
              { mathjs: "5", color: "#10b981", equation: "y = 5" }
            ],
            properties: [
              { name: "Valid Solution", value: "x = 5" },
              { name: "Extraneous Root", value: "x = -7 \\text{ (rejected)}" },
              { name: "Domain", value: "x > 1" },
              { name: "Vertical Asymptote", value: "x = 1" }
            ]
          }
        }
      }
    ]
  }
];
