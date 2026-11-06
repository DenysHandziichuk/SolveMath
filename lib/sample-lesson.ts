import type { Solution } from "@/components/SolutionDisplay";

export const SAMPLE_LESSON: Solution = {
  explanation: "Find the roots of a quadratic equation by factoring, then connect the solution to its graph.",
  slides: [
    {
      title: "Factor a quadratic",
      subtitle: "Algebra · Quadratic equations",
      content: "Where does the curve meet the x-axis?\n$$f(x) = x^2 - 5x + 6$$\nFind the zeros of the function, then explain what they tell us about its graph.",
      notes: "Begin by asking what it means for a function to have a zero. At an x-intercept, the output of the function is zero. We will use factoring to find those intercepts.",
      type: "intro",
    },
    {
      title: "Factor the expression",
      subtitle: "Step 1 · Look for a pattern",
      content: "Find two numbers whose product is 6 and whose sum is −5.\n$$(-2)(-3) = 6 \\qquad -2 + (-3) = -5$$\nSo the quadratic factors as:\n$$x^2 - 5x + 6 = (x - 2)(x - 3)$$",
      notes: "The constant term gives us the product, and the coefficient of x gives us the sum. Negative two and negative three satisfy both conditions. Expand the factors to check the result.",
      type: "solution",
    },
    {
      title: "Find the roots",
      subtitle: "Step 2 · Connect algebra and geometry",
      content: "Set each factor equal to zero.\n$$(x - 2)(x - 3) = 0$$\n$$x = 2 \\quad \\text{or} \\quad x = 3$$\nThe curve crosses the x-axis at $(2,0)$ and $(3,0)$.",
      notes: "A product equals zero when at least one factor is zero. On the graph, these two solutions are precisely the x-intercepts. The vertex lies halfway between the roots, at x equals two point five.",
      type: "graph",
      graphData: {
        title: "f(x) = x² − 5x + 6",
        equation: "x^2 - 5*x + 6",
        functions: [{ mathjs: "x^2 - 5*x + 6", color: "#60a5fa", equation: "x^2 - 5x + 6" }],
        points: [{ x: 2, y: 0 }, { x: 3, y: 0 }],
        bounds: { minX: 0, maxX: 5, minY: -1, maxY: 7 },
      },
    },
    {
      title: "Read the signs",
      subtitle: "Step 3 · Compare the intervals",
      content: "Between the roots, the curve is below the x-axis. Outside the roots, it is above the x-axis.",
      notes: "The roots divide the number line into three open intervals. The value of f is positive on the outer intervals, negative between two and three, and zero at each root. Edit the table to change any heading or sign.",
      type: "solution",
      layout: "table-graph",
      tables: [{
        kind: "sign", title: "$f(x) = (x-2)(x-3)$", firstColumnHeader: true,
        headers: ["Interval", "$x < 2$", "$x = 2$", "$2 < x < 3$", "$x = 3$", "$x > 3$"],
        rows: [["Sign of $f(x)$", "+", "0", "−", "0", "+"]],
      }],
      graphs: [{
        title: "f(x) = x² − 5x + 6",
        functions: [{ mathjs: "x^2 - 5*x + 6", color: "#60a5fa" }],
        points: [{ x: 2, y: 0 }, { x: 3, y: 0 }],
        bounds: { minX: 0, maxX: 5, minY: -1, maxY: 7 },
      }],
    },
    {
      title: "Answer and practice",
      subtitle: "Recap · Your turn",
      content: "Factoring connects a quadratic equation to its graph.\n$$x^2 - 5x + 6 = 0 \\implies x = 2 \\text{ or } x = 3$$\nTry it yourself: find the zeros of $g(x) = x^2 - 7x + 12$.",
      notes: "Recap the steps: find the factor pair, use the zero product property, and interpret the roots as x-intercepts. For the practice question, the factor pair is negative three and negative four, so the zeros are three and four.",
      type: "conclusion",
    },
  ],
};
