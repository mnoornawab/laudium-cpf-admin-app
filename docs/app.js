// Utility: parse CSV string to array of objects
function parseCSV(csv, delimiter = ",") {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(delimiter).map(h => h.trim());
  return lines.slice(1).map(line => {
    const cols = line.split(delimiter).map(c => c.trim());
    return Object.fromEntries(headers.map((h, i) => [h, cols[i] || ""]));
  });
}

// Load and display patroller list
async function loadPatrollers() {
  const res = await fetch("../patrollers.csv");
  const csv = await res.text();
  const data = parseCSV(csv);

  // Render table
  const table = document.getElementById("patrollers-table");
  table.innerHTML = "";
  if (!data.length) {
    table.innerHTML = "<tr><td>No patrollers found.</td></tr>";
    return;
  }
  const headers = Object.keys(data[0]);
  table.innerHTML =
    "<tr>" +
    headers.map(h => `<th>${h}</th>`).join("") +
    "</tr>" +
    data
      .map(
        row =>
          "<tr>" +
          headers.map(h => `<td>${row[h]}</td>`).join("") +
          "</tr>"
      )
      .join("");
  // For form: render checkboxes
  const patrollerDiv = document.getElementById("patroller-checkboxes");
  patrollerDiv.innerHTML = data
    .map(
      p =>
        `<label><input type="checkbox" name="patrollers" value="${p["Full Name & Surname"]} (${p["ID Card No"]})" /> ${p["Full Name & Surname"]} (${p["ID Card No"]})</label><br/>`
    )
    .join("");
}

// Booking form handler
document.getElementById("booking-form").onsubmit = function (e) {
  e.preventDefault();

  const form = e.target;
  const formData = new FormData(form);
  const booking = {
    eventType: formData.get("eventType"),
    obNumber: formData.get("obNumber"),
    shiftDate: formData.get("shiftDate"),
    shiftTimes: formData.get("shiftTimes"),
    patrollers: formData.getAll("patrollers").join("; "),
    timestamp: new Date().toISOString(),
  };

  // Download booking as CSV row (for manual upload/append to shifts.csv)
  const csvRow = [
    booking.eventType,
    booking.obNumber,
    booking.shiftDate,
    booking.shiftTimes,
    booking.patrollers,
    booking.timestamp,
  ]
    .map(v => `"${v.replace(/"/g, '""')}"`)
    .join(",") + "\n";

  // Option 1: Download as file for admin to upload
  const blob = new Blob([csvRow], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "booking.csv";
  a.click();

  document.getElementById("booking-result").textContent =
    "Booking generated! Download and append this row to shifts.csv in the repo.";

  form.reset();
  loadPatrollers(); // reload checkboxes
};

// Dashboard: summarize shifts.csv
async function loadDashboard() {
  const dashboardDiv = document.getElementById("dashboard");
  try {
    const res = await fetch("../shifts.csv");
    if (!res.ok) {
      dashboardDiv.textContent =
        "No shift bookings yet. Submit a booking above and upload shifts.csv to the repo.";
      return;
    }
    const csv = await res.text();
    const data = parseCSV(csv);
    if (!data.length) {
      dashboardDiv.textContent = "No shift bookings yet.";
      return;
    }
    // Example: show total bookings and top 5 patrollers by assignment count
    const patrollerCounts = {};
    data.forEach(row => {
      (row.patrollers || "")
        .split(";")
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(name => {
          patrollerCounts[name] = (patrollerCounts[name] || 0) + 1;
        });
    });
    const topPatrollers = Object.entries(patrollerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    dashboardDiv.innerHTML = `
      <b>Total Shift Bookings:</b> ${data.length} <br/>
      <b>Top 5 Patrollers by Assignments:</b><br/>
      <ol>
        ${topPatrollers
          .map(([name, count]) => `<li>${name}: ${count} shifts</li>`)
          .join("")}
      </ol>
    `;
  } catch (err) {
    dashboardDiv.textContent = "Error loading dashboard.";
  }
}

document.getElementById("load-patrollers").onclick = loadPatrollers;
document.getElementById("load-dashboard").onclick = loadDashboard;

// Auto-load patrollers on page load
window.onload = () => {
  loadPatrollers();
};