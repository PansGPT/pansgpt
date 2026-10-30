import type { QuizResult } from "@pansgpt/types";

export function scoreBreakdown(result: QuizResult): {
  id: "correct" | "partial" | "incorrect" | "unanswered";
  label: string;
  count: number;
  color: string;
}[] {
  return (
    [
      { id: "correct", label: "Correct", color: "#168354" },
      { id: "partial", label: "Partial", color: "#c48a23" },
      { id: "incorrect", label: "Incorrect", color: "#c45650" },
      { id: "unanswered", label: "Unanswered", color: "#98a2b3" },
    ] as const
  ).map((item) => ({
    ...item,
    count: result.feedback.filter((question) => question.outcome === item.id).length,
  }));
}

function drawTitle(context: CanvasRenderingContext2D, title: string): void {
  const words = title.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > 590) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  for (let index = 0; index < Math.min(3, lines.length); index++) {
    let text = lines[index];
    const truncated = context.measureText(text).width > 590 || (index === 2 && lines.length > 3);
    if (truncated) {
      while (text && context.measureText(`${text}…`).width > 590) text = text.slice(0, -1);
      text += "…";
    }
    context.fillText(text, 480, 292 + index * 54);
  }
}

export async function downloadScoreCard(result: QuizResult): Promise<void> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1000;
  const context = canvas.getContext("2d");
  if (!context) return;
  const font = "Arial, sans-serif";
  const breakdown = scoreBreakdown(result);
  context.fillStyle = "#f5f6f7";
  context.fillRect(0, 0, 1200, 1000);
  context.fillStyle = "#ffffff";
  context.strokeStyle = "#e4e7ec";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(48, 48, 1104, 904, 24);
  context.fill();
  context.stroke();
  context.fillStyle = "#182230";
  context.font = `600 28px ${font}`;
  context.fillText("PansGPT", 100, 120);
  context.fillStyle = "#667085";
  context.font = `20px ${font}`;
  context.textAlign = "right";
  context.fillText("QUIZ RESULT", 1100, 120);
  context.textAlign = "left";
  context.beginPath();
  context.moveTo(100, 160);
  context.lineTo(1100, 160);
  context.stroke();
  context.fillStyle = "#168354";
  context.font = `600 22px ${font}`;
  context.fillText(result.quiz.course_code, 480, 230);
  context.fillStyle = "#182230";
  context.font = `600 44px ${font}`;
  drawTitle(context, result.quiz.title);
  context.fillStyle = "#667085";
  context.font = `22px ${font}`;
  context.fillText(`${result.feedback.length} questions  ·  ${result.quiz.difficulty}`, 480, 466);
  context.fillText(
    `Time taken: ${Math.floor(result.time_taken_sec / 60)}m ${result.time_taken_sec % 60}s`,
    480,
    506
  );
  context.lineWidth = 18;
  context.strokeStyle = "#edf0f2";
  context.beginPath();
  context.arc(275, 365, 130, 0, Math.PI * 2);
  context.stroke();
  if (result.percentage > 0) {
    context.strokeStyle = "#168354";
    context.lineCap = "round";
    context.beginPath();
    context.arc(
      275,
      365,
      130,
      -Math.PI / 2,
      -Math.PI / 2 + (result.percentage / 100) * Math.PI * 2
    );
    context.stroke();
  }
  context.lineCap = "butt";
  context.textAlign = "center";
  context.fillStyle = "#667085";
  context.font = `20px ${font}`;
  context.fillText("Score", 275, 323);
  context.fillStyle = "#182230";
  context.font = `600 76px ${font}`;
  context.fillText(`${Math.round(result.percentage)}%`, 275, 399);
  context.fillStyle = "#667085";
  context.font = `22px ${font}`;
  context.fillText(`${result.score} / ${result.max_score} points`, 275, 440);
  context.textAlign = "left";
  context.fillStyle = "#667085";
  context.font = `20px ${font}`;
  context.fillText("Question breakdown", 100, 590);
  let offset = 100;
  for (const item of breakdown) {
    if (item.count === 0) continue;
    context.fillStyle = item.color;
    const width = (1000 * item.count) / Math.max(1, result.feedback.length);
    context.fillRect(offset, 614, width, 8);
    offset += width;
  }
  breakdown.forEach((item, index) => {
    const x = 100 + index * 260;
    context.fillStyle = item.color;
    context.beginPath();
    context.arc(x + 5, 686, 5, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#667085";
    context.font = `20px ${font}`;
    context.fillText(item.label, x + 22, 693);
    context.fillStyle = "#182230";
    context.font = `600 42px ${font}`;
    context.fillText(String(item.count), x, 754);
  });
  context.strokeStyle = "#e4e7ec";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(100, 824);
  context.lineTo(1100, 824);
  context.stroke();
  context.fillStyle = "#667085";
  context.font = `20px ${font}`;
  context.fillText("Completed", 100, 886);
  context.textAlign = "right";
  context.fillText(
    new Date(result.completed_at).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    1100,
    886
  );
  const anchor = document.createElement("a");
  anchor.download = "pansgpt-quiz-result.png";
  anchor.href = canvas.toDataURL("image/png");
  anchor.click();
}
