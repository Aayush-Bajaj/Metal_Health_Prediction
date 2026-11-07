// Change this if your FastAPI server runs elsewhere.
// Opened as a file -> local API. Served by the server (local or Render) -> same address.
const API_URL = location.protocol === "file:" ? " https://metal-health-prediction.onrender.com" : "/predict";

const countries = ["India","USA","Canada","Australia","UK","Germany","Mexico","Turkey","France","Other"];
const platforms = ["Instagram","TikTok","YouTube","Facebook","WhatsApp","Snapchat","Twitter","LinkedIn","LINE","KakaoTalk","VKontakte","WeChat"];
const fill = (id, list) => document.getElementById(id).innerHTML = list.map(v => `<option>${v}</option>`).join("");
fill("country", countries); fill("platform", platforms);

const form = document.getElementById("form");
form.querySelectorAll("input[type=range]").forEach(r => {
  const out = form.querySelector(`output[data-for="${r.name}"]`);
  r.addEventListener("input", () => out.textContent = r.value);
});

// Hero orb drifts between sample scores
const heroScore = document.getElementById("heroScore");
const samples = [7.4, 5.8, 8.1, 6.3];
let si = 0;
setInterval(() => { si = (si + 1) % samples.length; heroScore.textContent = samples[si]; }, 2600);

const arc = document.getElementById("arc");
const result = document.querySelector(".result");

function show(score, source) {
  const pct = Math.max(0, Math.min(1, (score - 1) / 9));
  arc.style.strokeDashoffset = 252 * (1 - pct);
  arc.style.stroke = score >= 7 ? "#4ade80" : score >= 5 ? "#F26B1D" : "#a78bfa";
  document.getElementById("score").textContent = score.toFixed(1);
  const verdict = score >= 7.5 ? "Thriving habits" : score >= 6 ? "Doing okay, with room to grow" : score >= 4.5 ? "Showing strain" : "Needs attention";
  document.getElementById("verdict").textContent = verdict;
  document.getElementById("note").textContent = "Predicted wellbeing score. Higher is better.";
  document.getElementById("src").textContent = source;
  const d = Object.fromEntries(new FormData(form));
  const tips = [];
  if (+d.sleep_hours_per_night < 7) tips.push("Aim for 7 to 9 hours of sleep. It is the habit most tied to mood.");
  if (+d.avg_daily_usage_hours > 5) tips.push("Try cutting social media by an hour, starting with late evening.");
  if (+d.physical_activity_hours < 1) tips.push("Add a 30 minute walk or workout to your day.");
  if (+d.daily_unlocks > 100) tips.push("Turn off non-essential notifications to reduce phone checks.");
  if (!tips.length) tips.push("Your routine looks balanced. Keep it steady.");
  document.getElementById("tips").innerHTML = tips.slice(0, 3).map(t => `<li>${t}</li>`).join("");
}

// Rough offline estimate, used only when the API is unreachable.
function estimate(d) {
  let s = 7 - 0.35 * (d.avg_daily_usage_hours - 3) + 0.4 * (d.sleep_hours_per_night - 7)
        + 0.3 * d.physical_activity_hours - 0.004 * (d.daily_unlocks - 50);
  s -= { Low: -0.5, Medium: 0, High: 0.7, "Very High": 1.3 }[d.stress_level];
  return Math.max(1, Math.min(10, s));
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = document.getElementById("go");
  const raw = Object.fromEntries(new FormData(form));
  const num = ["age","avg_daily_usage_hours","daily_unlocks","study_hours","physical_activity_hours","sleep_hours_per_night"];
  const body = { ...raw };
  num.forEach(k => body[k] = Number(raw[k]));
  btn.disabled = true; btn.textContent = "Predicting...";
  result.classList.remove("err");
  try {
    const res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    show(data.predicted_mental_health_score, "Prediction from your trained model.");
  } catch {
    result.classList.add("err");
    show(estimate(body), "Backend not reachable, so this is a rough demo estimate. Start it with: uvicorn main:app --reload");
  } finally {
    btn.disabled = false; btn.textContent = "Predict wellbeing score";
  }
});
