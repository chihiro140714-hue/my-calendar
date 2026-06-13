const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const modal = document.getElementById("modal");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const selectedHolidayName = document.getElementById("selectedHolidayName");
const eventList = document.getElementById("eventList");
const eventInput = document.getElementById("eventInput");
const eventTime = document.getElementById("eventTime");
const eventMemo = document.getElementById("eventMemo");
const addEventBtn = document.getElementById("addEventBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let currentDate = new Date();
let selectedDate = "";
let editingEventId = null;
let holidayData = {};

const HOLIDAY_API_URL = "https://holidays-jp.github.io/api/v1/date.json";

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString() + Math.random().toString(16).slice(2);
}

function getEvents() {
  const saved = localStorage.getItem("calendarEvents");
  const events = JSON.parse(saved || "{}");

  Object.keys(events).forEach((dateKey) => {
    events[dateKey] = events[dateKey].map((event) => {
      if (typeof event === "string") {
        return {
          id: createId(),
          title: event,
          time: "",
          memo: ""
        };
      }

      if (!event.id) {
        event.id = createId();
      }

      if (!event.time) {
        event.time = "";
      }

      if (!event.memo) {
        event.memo = "";
      }

      return event;
    });
  });

  saveEvents(events);

  return events;
}

function saveEvents(events) {
  localStorage.setItem("calendarEvents", JSON.stringify(events));
}

function makeDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateJapanese(dateKey) {
  const date = new Date(dateKey + "T00:00:00");
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[date.getDay()];

  return `${month}月${day}日（${weekday}）`;
}

async function loadHolidays() {
  const cached = localStorage.getItem("holidayData");

  if (cached) {
    holidayData = JSON.parse(cached);
    renderCalendar();
  }

  try {
    const response = await fetch(HOLIDAY_API_URL);

    if (!response.ok) {
      throw new Error("祝日データを取得できませんでした");
    }

    holidayData = await response.json();

    localStorage.setItem("holidayData", JSON.stringify(holidayData));

    renderCalendar();
  } catch (error) {
    console.log(error);

    if (!cached) {
      holidayData = {};
      renderCalendar();
    }
  }
}

function renderCalendar() {
  calendar.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthTitle.textContent = `${year}年${month + 1}月`;

  const weekdays = [
    { label: "日", className: "sunday" },
    { label: "月", className: "" },
    { label: "火", className: "" },
    { label: "水", className: "" },
    { label: "木", className: "" },
    { label: "金", className: "" },
    { label: "土", className: "saturday" }
  ];

  weekdays.forEach((weekday) => {
    const div = document.createElement("div");
    div.className = `weekday ${weekday.className}`;
    div.textContent = weekday.label;
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
    const holidayName = holidayData[dateKey] || "";
    const dayOfWeek = new Date(year, month, day).getDay();

    const div = document.createElement("div");
    div.className = "day";

    if (dayOfWeek === 0) {
      div.classList.add("sunday");
    }

    if (dayOfWeek === 6) {
      div.classList.add("saturday");
    }

    if (holidayName) {
      div.classList.add("holiday");
    }

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

    if (holidayName) {
      const holiday = document.createElement("div");
      holiday.className = "holiday-small";
      holiday.textContent = holidayName;
      div.appendChild(holiday);
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

  const holidayName = holidayData[dateKey] || "";

  if (holidayName) {
    selectedHolidayName.textContent = holidayName;
  } else {
    selectedHolidayName.textContent = "";
  }

  modal.style.display = "flex";

  resetForm();
  renderEventList();

  setTimeout(() => {
    eventInput.focus();
  }, 100);
}

function closeModal() {
  modal.style.display = "none";
  resetForm();
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
        ${
          event.memo
            ? `<div class="event-memo">${escapeHTML(event.memo)}</div>`
            : ""
        }
      </div>

      <div class="event-actions">
        <button class="edit-btn" data-id="${event.id}">編集</button>
        <button class="delete-btn" data-id="${event.id}">削除</button>
      </div>
    `;

    eventList.appendChild(div);
  });

  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      startEditEvent(button.dataset.id);
    });
  });

  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteEvent(button.dataset.id);
    });
  });
}

function addOrUpdateEvent() {
  const title = eventInput.value.trim();
  const time = eventTime.value;
  const memo = eventMemo.value.trim();

  if (title === "") {
    alert("予定を入力してください");
    return;
  }

  const events = getEvents();

  if (!events[selectedDate]) {
    events[selectedDate] = [];
  }

  if (editingEventId) {
    events[selectedDate] = events[selectedDate].map((event) => {
      if (event.id === editingEventId) {
        return {
          ...event,
          title: title,
          time: time,
          memo: memo
        };
      }

      return event;
    });
  } else {
    events[selectedDate].push({
      id: createId(),
      title: title,
      time: time,
      memo: memo
    });
  }

  saveEvents(events);

  resetForm();
  renderEventList();
  renderCalendar();
}

function startEditEvent(eventId) {
  const events = getEvents();
  const dayEvents = events[selectedDate] || [];
  const targetEvent = dayEvents.find((event) => event.id === eventId);

  if (!targetEvent) {
    return;
  }

  editingEventId = eventId;
  eventInput.value = targetEvent.title;
  eventTime.value = targetEvent.time || "";
  eventMemo.value = targetEvent.memo || "";

  addEventBtn.textContent = "変更を保存";
  cancelEditBtn.style.display = "block";

  eventInput.focus();
}

function resetForm() {
  editingEventId = null;
  eventInput.value = "";
  eventTime.value = "";
  eventMemo.value = "";
  addEventBtn.textContent = "予定を追加";
  cancelEditBtn.style.display = "none";
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

  resetForm();
  renderEventList();
  renderCalendar();
}

function goToday() {
  currentDate = new Date();
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

document.getElementById("todayBtn").addEventListener("click", goToday);

addEventBtn.addEventListener("click", addOrUpdateEvent);

cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

document.getElementById("closeBtn").addEventListener("click", closeModal);

eventInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addOrUpdateEvent();
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

renderCalendar();
loadHolidays();