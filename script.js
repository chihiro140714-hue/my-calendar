const APP_NAME = "Noir Calendar";
const DEFAULT_COLOR = "#0A84FF";

const calendar = document.getElementById("calendar");
const monthTitle = document.getElementById("monthTitle");
const modal = document.getElementById("modal");
const modalModeLabel = document.getElementById("modalModeLabel");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const selectedHolidayName = document.getElementById("selectedHolidayName");
const selectedDayTitle = document.getElementById("selectedDayTitle");
const selectedDayHoliday = document.getElementById("selectedDayHoliday");
const todayDateLabel = document.getElementById("todayDateLabel");
const todayEventList = document.getElementById("todayEventList");
const selectedDayEventList = document.getElementById("selectedDayEventList");
const eventInput = document.getElementById("eventInput");
const eventTime = document.getElementById("eventTime");
const eventMemo = document.getElementById("eventMemo");
const addEventBtn = document.getElementById("addEventBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let currentDate = new Date();
let selectedDate = getTodayKey();
let editingEventId = null;
let selectedColor = DEFAULT_COLOR;
let holidayData = {};

const HOLIDAY_API_URL = "https://holidays-jp.github.io/api/v1/date.json";

document.title = APP_NAME;
document.getElementById("appTitle").textContent = APP_NAME;

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return Date.now().toString() + Math.random().toString(16).slice(2);
}

function getTodayKey() {
  const today = new Date();
  return makeDateKey(today.getFullYear(), today.getMonth(), today.getDate());
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
          memo: "",
          color: DEFAULT_COLOR
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

      if (!event.color) {
        event.color = DEFAULT_COLOR;
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

function dateKeyToDate(dateKey) {
  return new Date(dateKey + "T00:00:00");
}

function formatDateJapanese(dateKey) {
  const date = dateKeyToDate(dateKey);
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
    renderAll();
  }

  try {
    const response = await fetch(HOLIDAY_API_URL);

    if (!response.ok) {
      throw new Error("祝日データを取得できませんでした");
    }

    holidayData = await response.json();
    localStorage.setItem("holidayData", JSON.stringify(holidayData));
    renderAll();
  } catch (error) {
    console.log(error);

    if (!cached) {
      holidayData = {};
      renderAll();
    }
  }
}

function renderAll() {
  renderTodayEvents();
  renderCalendar();
  renderSelectedDayEvents();
}

function renderTodayEvents() {
  const todayKey = getTodayKey();

  todayDateLabel.textContent = formatDateJapanese(todayKey);
  renderEventList(todayEventList, todayKey, "今日の予定はありません");
}

function renderSelectedDayEvents() {
  selectedDayTitle.textContent = formatDateJapanese(selectedDate);
  selectedDayHoliday.textContent = holidayData[selectedDate] || "";

  renderEventList(
    selectedDayEventList,
    selectedDate,
    "この日の予定はありません"
  );
}

function renderEventList(container, dateKey, emptyMessage) {
  container.innerHTML = "";

  const events = getEvents();
  const dayEvents = [...(events[dateKey] || [])];

  dayEvents.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

  if (dayEvents.length === 0) {
    container.innerHTML = `<p class="empty-message">${emptyMessage}</p>`;
    return;
  }

  dayEvents.forEach((event) => {
    const div = document.createElement("div");
    div.className = "event-item";

    div.innerHTML = `
      <div class="event-color-line" style="background:${event.color || DEFAULT_COLOR}"></div>

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
        <button class="edit-btn" data-date="${dateKey}" data-id="${event.id}">編集</button>
        <button class="delete-btn" data-date="${dateKey}" data-id="${event.id}">削除</button>
      </div>
    `;

    container.appendChild(div);
  });

  container.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      startEditEvent(button.dataset.date, button.dataset.id);
    });
  });

  container.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteEvent(button.dataset.date, button.dataset.id);
    });
  });
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
  const todayKey = getTodayKey();

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

    if (dateKey === todayKey) {
      div.classList.add("today");
    }

    if (dateKey === selectedDate) {
      div.classList.add("selected");
    }

    div.innerHTML = `
      <div class="day-number">${day}</div>
    `;

    if (holidayName) {
      const holiday = document.createElement("div");
      holiday.className = "holiday-small";
      holiday.textContent = holidayName;
      div.appendChild(holiday);
    }

    if (dayEvents.length > 0) {
      div.classList.add("has-event");

      const dots = document.createElement("div");
      dots.className = "calendar-dots";

      dayEvents.slice(0, 3).forEach((event) => {
        const dot = document.createElement("div");
        dot.className = "event-dot";
        dot.style.background = event.color || DEFAULT_COLOR;
        dots.appendChild(dot);
      });

      div.appendChild(dots);

      const count = document.createElement("div");
      count.className = "event-count";
      count.textContent = `${dayEvents.length}件`;
      div.appendChild(count);
    }

    div.addEventListener("click", () => {
      selectDate(dateKey);
    });

    calendar.appendChild(div);
  }
}

function selectDate(dateKey) {
  selectedDate = dateKey;
  renderCalendar();
  renderSelectedDayEvents();
}

function openAddModal(dateKey) {
  selectedDate = dateKey;
  resetForm();

  modalModeLabel.textContent = "NEW EVENT";
  selectedDateTitle.textContent = formatDateJapanese(selectedDate);
  selectedHolidayName.textContent = holidayData[selectedDate] || "";

  modal.style.display = "flex";

  setTimeout(() => {
    eventInput.focus();
  }, 100);
}

function closeModal() {
  modal.style.display = "none";
  resetForm();
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
          memo: memo,
          color: selectedColor
        };
      }

      return event;
    });
  } else {
    events[selectedDate].push({
      id: createId(),
      title: title,
      time: time,
      memo: memo,
      color: selectedColor
    });
  }

  saveEvents(events);

  closeModal();
  renderAll();
}

function startEditEvent(dateKey, eventId) {
  selectedDate = dateKey;

  const date = dateKeyToDate(dateKey);
  currentDate = new Date(date.getFullYear(), date.getMonth(), 1);

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
  selectedColor = targetEvent.color || DEFAULT_COLOR;
  updateColorSelection();

  modalModeLabel.textContent = "EDIT EVENT";
  selectedDateTitle.textContent = formatDateJapanese(selectedDate);
  selectedHolidayName.textContent = holidayData[selectedDate] || "";

  addEventBtn.textContent = "変更を保存";
  cancelEditBtn.style.display = "block";

  modal.style.display = "flex";

  renderAll();

  setTimeout(() => {
    eventInput.focus();
  }, 100);
}

function resetForm() {
  editingEventId = null;
  eventInput.value = "";
  eventTime.value = "";
  eventMemo.value = "";
  selectedColor = DEFAULT_COLOR;
  updateColorSelection();
  addEventBtn.textContent = "予定を追加";
  cancelEditBtn.style.display = "none";
}

function deleteEvent(dateKey, eventId) {
  const result = confirm("この予定を削除しますか？");

  if (!result) {
    return;
  }

  const events = getEvents();

  events[dateKey] = (events[dateKey] || []).filter((event) => {
    return event.id !== eventId;
  });

  if (events[dateKey].length === 0) {
    delete events[dateKey];
  }

  saveEvents(events);

  if (editingEventId === eventId) {
    resetForm();
  }

  renderAll();
}

function goToday() {
  currentDate = new Date();
  selectedDate = getTodayKey();
  renderAll();
}

function updateColorSelection() {
  document.querySelectorAll(".color-choice").forEach((button) => {
    if (button.dataset.color === selectedColor) {
      button.classList.add("selected");
    } else {
      button.classList.remove("selected");
    }
  });
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

document.getElementById("openAddModalBtn").addEventListener("click", () => {
  openAddModal(selectedDate);
});

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

document.querySelectorAll(".color-choice").forEach((button) => {
  button.addEventListener("click", () => {
    selectedColor = button.dataset.color;
    updateColorSelection();
  });
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

renderAll();
loadHolidays();