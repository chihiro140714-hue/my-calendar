const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const modal = document.getElementById("modal");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const eventList = document.getElementById("eventList");
const eventInput = document.getElementById("eventInput");
const eventTime = document.getElementById("eventTime");

let currentDate = new Date();
let selectedDate = "";

function getEvents() {
  const saved = localStorage.getItem("calendarEvents");
  const events = JSON.parse(saved || "{}");

  // 古い形式のデータが残っていても動くように変換
  Object.keys(events).forEach((dateKey) => {
    events[dateKey] = events[dateKey].map((event) => {
      if (typeof event === "string") {
        return {
          id: crypto.randomUUID(),
          title: event,
          time: ""
        };
      }

      return event;
    });
  });

  return events;
}

function saveEvents(events) {
  localStorage.setItem("calendarEvents", JSON.stringify(events));
}

function makeDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateJapanese(dateKey) {
  const [year, month, day] = dateKey.split("-");
  return `${Number(month)}月${Number(day)}日`;
}

function renderCalendar() {
  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.textContent = `${year}年${month + 1}月`;

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  weekdays.forEach((weekday) => {
    const div = document.createElement("div");
    div.className = "weekday";
    div.textContent = weekday;
    calendar.appendChild(div);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const events = getEvents();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= lastDate; day++) {
    const dateKey = makeDateKey(year, month, day);
    const dayEvents = events[dateKey] || [];

    const div = document.createElement("div");
    div.className = "day";

    div.innerHTML = `
      <div class="day-number">${day}</div>
    `;

    const isToday =
      year === today.getFullYear() &&
      month === today.getMonth() &&
      day === today.getDate();

    if (isToday) {
      div.classList.add("today");
    }

    if (dayEvents.length > 0) {
      div.classList.add("has-event");

      const dot = document.createElement("div");
      dot.className = "event-dot";
      div.appendChild(dot);

      const count = document.createElement("div");
      count.className = "event-count";
      count.textContent = `${dayEvents.length}件`;
      div.appendChild(count);
    }

    div.addEventListener("click", () => {
      openModal(dateKey);
    });

    calendar.appendChild(div);
  }
}

function openModal(dateKey) {
  selectedDate = dateKey;
  selectedDateTitle.textContent = formatDateJapanese(dateKey);
  modal.style.display = "flex";
  eventInput.value = "";
  eventTime.value = "";
  renderEventList();

  setTimeout(() => {
    eventInput.focus();
  }, 100);
}

function closeModal() {
  modal.style.display = "none";
}

function renderEventList() {
  eventList.innerHTML = "";

  const events = getEvents();
  const dayEvents = events[selectedDate] || [];

  dayEvents.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  if (dayEvents.length === 0) {
    eventList.innerHTML = `<p class="empty-message">予定はありません</p>`;
    return;
  }

  dayEvents.forEach((event) => {
    const div = document.createElement("div");
    div.className = "event-item";

    div.innerHTML = `
      <div class="event-main">
        <div class="event-time">${event.time || "時間なし"}</div>
        <div class="event-title">${escapeHTML(event.title)}</div>
      </div>
      <button class="delete-btn" data-id="${event.id}">削除</button>
    `;

    eventList.appendChild(div);
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteEvent(button.dataset.id);
    });
  });
}

function addEvent() {
  const title = eventInput.value.trim();
  const time = eventTime.value;

  if (title === "") {
    alert("予定を入力してください");
    return;
  }

  const events = getEvents();

  if (!events[selectedDate]) {
    events[selectedDate] = [];
  }

  events[selectedDate].push({
    id: crypto.randomUUID(),
    title: title,
    time: time
  });

  saveEvents(events);

  eventInput.value = "";
  eventTime.value = "";

  renderEventList();
  renderCalendar();
}

function deleteEvent(eventId) {
  const result = confirm("この予定を削除しますか？");

  if (!result) {
    return;
  }

  const events = getEvents();

  events[selectedDate] = (events[selectedDate] || []).filter((event) => {
    return event.id !== eventId;
  });

  if (events[selectedDate].length === 0) {
    delete events[selectedDate];
  }

  saveEvents(events);

  renderEventList();
  renderCalendar();
}

function escapeHTML(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.getElementById("prevBtn").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextBtn").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById("addEventBtn").addEventListener("click", addEvent);
document.getElementById("closeBtn").addEventListener("click", closeModal);

eventInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addEvent();
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

renderCalendar();