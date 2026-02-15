import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

const dayOptions = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 }
];

const groupOptions = ["Personal", "Health", "Study", "Fitness", "Work", "Mind", "Other"];
const goalOptions = [
  { label: "Weekly", value: "weekly" },
  { label: "Daily", value: "daily" }
];
const CACHE_KEY = "habitCache";
const QUEUE_KEY = "habitQueue";

function Dashboard() {
  const navigate = useNavigate();
  const [habits, setHabits] = useState([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [group, setGroup] = useState("Personal");
  const [scheduleDays, setScheduleDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [goalType, setGoalType] = useState("weekly");
  const [goalTarget, setGoalTarget] = useState(3);
  const [filter, setFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editGroup, setEditGroup] = useState("Personal");
  const [editScheduleDays, setEditScheduleDays] = useState([]);
  const [editGoalType, setEditGoalType] = useState("weekly");
  const [editGoalTarget, setEditGoalTarget] = useState(3);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [calendarHabitId, setCalendarHabitId] = useState("all");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [lastReminderKey, setLastReminderKey] = useState("");
  const [notificationStatus, setNotificationStatus] = useState("unsupported");
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    timezone: "UTC",
    reminderTime: "20:00",
    reminderEnabled: false,
    reminderChannels: { email: true, sms: false }
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const showToast = useCallback((message, tone = "info") => {
    setToast({ message, tone });
  }, []);

  const loadQueue = useCallback(() => {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      return [];
    }
  }, []);

  const saveQueue = useCallback((queue) => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, []);

  const requestNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast("Notifications are not supported in this browser.", "error");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
    if (permission === "granted") {
      showToast("Notifications enabled", "success");
    }
  }, [showToast]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const storedTime = localStorage.getItem("reminderTime");
    const storedEnabled = localStorage.getItem("reminderEnabled");
    const storedKey = localStorage.getItem("lastReminderKey");

    if (storedTime) setReminderTime(storedTime);
    if (storedEnabled) setReminderEnabled(storedEnabled === "true");
    if (storedKey) setLastReminderKey(storedKey);

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationStatus(Notification.permission);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("reminderTime", reminderTime);
    localStorage.setItem("reminderEnabled", String(reminderEnabled));
    if (lastReminderKey) {
      localStorage.setItem("lastReminderKey", lastReminderKey);
    }
  }, [reminderTime, reminderEnabled, lastReminderKey]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchHabits = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/habits");
      setHabits(res.data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/");
        return;
      }
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setHabits(JSON.parse(cached));
        showToast("Offline mode: showing cached habits.", "info");
      }
      setError("Could not load habits. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      const user = res.data.user;
      setProfile(user);
      setProfileForm({
        name: user?.name || "",
        phone: user?.phone || "",
        timezone: user?.timezone || "UTC",
        reminderTime: user?.reminderTime || "20:00",
        reminderEnabled: !!user?.reminderEnabled,
        reminderChannels: {
          email: user?.reminderChannels?.email ?? true,
          sms: user?.reminderChannels?.sms ?? false
        }
      });
      setReminderTime(user?.reminderTime || "20:00");
      setReminderEnabled(!!user?.reminderEnabled);
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/");
      }
    }
  }, [navigate]);

  const saveProfile = async () => {
    if (!isOnline) {
      showToast("You are offline. Profile updates will sync later.", "info");
      return;
    }
    try {
      setProfileSaving(true);
      const res = await API.patch("/auth/profile", profileForm);
      setProfile(res.data.user);
      setReminderTime(res.data.user.reminderTime || "20:00");
      setReminderEnabled(!!res.data.user.reminderEnabled);
      showToast("Profile updated", "success");
    } catch (err) {
      showToast("Could not update profile.", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  useEffect(() => {
    fetchHabits();
    fetchProfile();
  }, [fetchHabits, fetchProfile]);

  const flushQueue = useCallback(async () => {
    const queue = loadQueue();
    if (queue.length === 0) return;

    const idMap = {};
    const remaining = [];

    for (const action of queue) {
      try {
        if (action.type === "add") {
          const res = await API.post("/habits", action.payload);
          idMap[action.tempId] = res.data._id;
          setHabits((prev) =>
            prev.map((habit) =>
              habit._id === action.tempId ? res.data : habit
            )
          );
        }

        if (action.type === "complete") {
          const targetId = idMap[action.id] || action.id;
          await API.patch(`/habits/${targetId}/complete`, {});
        }

        if (action.type === "delete") {
          const targetId = idMap[action.id] || action.id;
          await API.delete(`/habits/${targetId}`);
        }

        if (action.type === "update") {
          const targetId = idMap[action.id] || action.id;
          await API.patch(`/habits/${targetId}`, action.payload);
        }
      } catch (err) {
        remaining.push(action);
      }
    }

    saveQueue(remaining);
    if (remaining.length === 0) {
      showToast("Offline changes synced.", "success");
      fetchHabits();
    }
  }, [fetchHabits, loadQueue, saveQueue, showToast]);

  useEffect(() => {
    if (isOnline) {
      flushQueue();
    }
  }, [isOnline, flushQueue]);

  const addHabit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      category: category.trim() || "General",
      group: group.trim() || "Personal",
      scheduleDays,
      goalType,
      goalTarget: goalType === "daily" ? 1 : goalTarget
    };

    if (!isOnline) {
      const tempId = `temp-${Date.now()}`;
      const tempHabit = {
        _id: tempId,
        ...payload,
        completedDates: [],
        createdAt: new Date().toISOString()
      };
      setHabits((prev) => [tempHabit, ...prev]);
      const queue = loadQueue();
      queue.push({ type: "add", tempId, payload });
      saveQueue(queue);
      setTitle("");
      setCategory("General");
      setGroup("Personal");
      setScheduleDays([0, 1, 2, 3, 4, 5, 6]);
      setGoalType("weekly");
      setGoalTarget(3);
      showToast("Saved offline. Will sync when online.", "info");
      return;
    }
    try {
      setLoading(true);
      await API.post("/habits", payload);
      setTitle("");
      setCategory("General");
      setGroup("Personal");
      setScheduleDays([0, 1, 2, 3, 4, 5, 6]);
      setGoalType("weekly");
      setGoalTarget(3);
      showToast("Habit added", "success");
      fetchHabits();
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/");
        return;
      }
      const message = err?.response?.data?.msg || "Could not add the habit.";
      setError(message);
      showToast(message, "error");
      setLoading(false);
    }
  };

  const isSameDay = useCallback(
    (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate(),
    []
  );

  const completeHabit = async (id) => {
    const today = new Date();
    setHabits((prev) =>
      prev.map((habit) => {
        if (habit._id !== id) return habit;
        const completedDates = habit.completedDates || [];
        const alreadyDone = completedDates.some((date) => isSameDay(new Date(date), today));
        if (alreadyDone) return habit;
        return {
          ...habit,
          completedDates: [...completedDates, today.toISOString()]
        };
      })
    );

    if (!isOnline) {
      const queue = loadQueue();
      queue.push({ type: "complete", id });
      saveQueue(queue);
      showToast("Saved offline. Will sync when online.", "info");
      return;
    }

    try {
      await API.patch(`/habits/${id}/complete`, {});
      showToast("Marked complete", "success");
      fetchHabits();
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/");
        return;
      }
      showToast("Could not update the habit.", "error");
      fetchHabits();
    }
  };

  const deleteHabit = async (id) => {
    const previous = habits;
    setHabits((prev) => prev.filter((habit) => habit._id !== id));
    if (!isOnline) {
      const queue = loadQueue();
      queue.push({ type: "delete", id });
      saveQueue(queue);
      showToast("Saved offline. Will sync when online.", "info");
      return;
    }
    try {
      await API.delete(`/habits/${id}`);
      showToast("Habit deleted", "success");
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/");
        return;
      }
      setHabits(previous);
      showToast("Could not delete the habit.", "error");
    }
  };

  const startEdit = (habit) => {
    setEditingId(habit._id);
    setEditTitle(habit.title || "");
    setEditCategory(habit.category || "General");
    setEditGroup(habit.group || "Personal");
    setEditScheduleDays(habit.scheduleDays || [0, 1, 2, 3, 4, 5, 6]);
    setEditGoalType(habit.goalType || "weekly");
    setEditGoalTarget(habit.goalTarget || 3);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id) => {
    const payload = {
      title: editTitle.trim(),
      category: editCategory.trim() || "General",
      group: editGroup.trim() || "Personal",
      scheduleDays: editScheduleDays,
      goalType: editGoalType,
      goalTarget: editGoalType === "daily" ? 1 : Number(editGoalTarget) || 1
    };

    if (!isOnline) {
      setHabits((prev) =>
        prev.map((habit) =>
          habit._id === id ? { ...habit, ...payload } : habit
        )
      );
      const queue = loadQueue();
      queue.push({ type: "update", id, payload });
      saveQueue(queue);
      setEditingId(null);
      showToast("Saved offline. Will sync when online.", "info");
      return;
    }
    try {
      await API.patch(`/habits/${id}`, payload);
      setEditingId(null);
      showToast("Habit updated", "success");
      fetchHabits();
    } catch (err) {
      if (err?.response?.status === 401) {
        navigate("/");
        return;
      }
      const message = err?.response?.data?.msg || "Could not update the habit.";
      showToast(message, "error");
    }
  };

  const toggleDay = (day, current, setter) => {
    if (current.includes(day)) {
      const next = current.filter((value) => value !== day);
      setter(next.length ? next : [day]);
    } else {
      setter([...current, day].sort());
    }
  };

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } catch (err) {
      // Ignore logout errors and still redirect.
    }
    navigate("/");
  };

  const isCompletedToday = useCallback(
    (habit) =>
      (habit.completedDates || []).some((date) =>
        isSameDay(new Date(date), new Date())
      ),
    [isSameDay]
  );

  const getLastCompleted = (habit) => {
    if (!habit.completedDates || habit.completedDates.length === 0) return null;
    return habit.completedDates
      .map((date) => new Date(date))
      .reduce((latest, current) => (current > latest ? current : latest));
  };

  const getScheduleDays = useCallback(
    (habit) =>
      habit.scheduleDays && habit.scheduleDays.length > 0
        ? habit.scheduleDays
        : [0, 1, 2, 3, 4, 5, 6],
    []
  );

  const getDateKey = useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const getStreaks = (habit) => {
    const schedule = getScheduleDays(habit);
    const completedSet = new Set(
      (habit.completedDates || []).map((date) => new Date(date).toDateString())
    );

    const startDate = habit.createdAt ? new Date(habit.createdAt) : new Date();
    const today = new Date();
    let current = 0;
    let best = 0;
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    while (cursor <= today) {
      if (schedule.includes(cursor.getDay())) {
        if (completedSet.has(cursor.toDateString())) {
          current += 1;
        } else {
          current = 0;
        }
        best = Math.max(best, current);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return { current, best };
  };

  const getWeekStart = useCallback((date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    return start;
  }, []);

  const countWeeklyCompletions = useCallback(
    (habit, date = new Date()) => {
      const start = getWeekStart(date);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return (habit.completedDates || []).filter((day) => {
        const parsed = new Date(day);
        return parsed >= start && parsed <= end;
      }).length;
    },
    [getWeekStart]
  );

  const filteredHabits = useMemo(() => {
    const normalized = [...habits].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0);
      const bDate = new Date(b.createdAt || 0);
      return bDate - aDate;
    });

    return normalized.filter((habit) => {
      const completedTodayFlag = isCompletedToday(habit);
      const matchesGroup =
        groupFilter === "all" ||
        (habit.group || "Personal") === groupFilter;
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !completedTodayFlag) ||
        (filter === "completed" && completedTodayFlag);

      const target = `${habit.title} ${habit.category || ""}`.toLowerCase();
      const matchesQuery = target.includes(query.toLowerCase());
      return matchesGroup && matchesFilter && matchesQuery;
    });
  }, [habits, filter, query, isCompletedToday, groupFilter]);

  const groupList = useMemo(() => {
    const set = new Set(groupOptions);
    habits.forEach((habit) => {
      if (habit.group) set.add(habit.group);
    });
    return ["all", ...Array.from(set)];
  }, [habits]);

  const totalHabits = habits.length;
  const completedToday = habits.filter(isCompletedToday).length;
  const dueToday = habits.filter((habit) =>
    getScheduleDays(habit).includes(new Date().getDay())
  ).length;
  const totalCompletions = habits.reduce(
    (sum, habit) => sum + (habit.completedDates?.length || 0),
    0
  );
  const bestStreak = habits.reduce((max, habit) => {
    const streak = getStreaks(habit).best;
    return streak > max ? streak : max;
  }, 0);

  const weeklyStats = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);

    let totalDue = 0;
    let totalCompleted = 0;

    habits.forEach((habit) => {
      const schedule = getScheduleDays(habit);
      const completedSet = new Set(
        (habit.completedDates || []).map((date) => new Date(date).toDateString())
      );

      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      while (cursor <= today) {
        if (schedule.includes(cursor.getDay())) {
          totalDue += 1;
          if (completedSet.has(cursor.toDateString())) {
            totalCompleted += 1;
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });

    const rate = totalDue === 0 ? 0 : Math.round((totalCompleted / totalDue) * 100);
    return { totalDue, totalCompleted, rate };
  }, [habits, getScheduleDays]);

  const badges = useMemo(() => {
    const list = [];
    if (totalHabits >= 1) list.push("Starter");
    if (totalHabits >= 5) list.push("Habit Architect");
    if (bestStreak >= 7) list.push("Steady 7");
    if (bestStreak >= 21) list.push("Streak Master");
    if (totalCompletions >= 20) list.push("20 Check-ins");
    if (totalCompletions >= 50) list.push("Momentum 50");
    return list;
  }, [totalHabits, bestStreak, totalCompletions]);

  const weeklyTrend = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      let due = 0;
      let completed = 0;

      habits.forEach((habit) => {
        const schedule = getScheduleDays(habit);
        const completedSet = new Set(
          (habit.completedDates || []).map((day) => new Date(day).toDateString())
        );

        if (schedule.includes(date.getDay())) {
          due += 1;
          if (completedSet.has(date.toDateString())) {
            completed += 1;
          }
        }
      });

      return {
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        due,
        completed
      };
    });
  }, [habits, getScheduleDays]);

  const weeklyMax = Math.max(1, ...weeklyTrend.map((day) => day.due));

  useEffect(() => {
    if (!reminderEnabled) return undefined;
    if (!reminderTime) return undefined;

    const timer = setInterval(() => {
      const now = new Date();
      const [hours, minutes] = reminderTime.split(":").map(Number);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

      if (now.getHours() === hours && now.getMinutes() === minutes) {
        const todayKey = getDateKey(now);
        if (lastReminderKey === todayKey) return;

        const dueHabits = habits.filter((habit) => {
          const dueTodayFlag = getScheduleDays(habit).includes(now.getDay());
          return dueTodayFlag && !isCompletedToday(habit);
        });

        if (dueHabits.length > 0) {
          showToast(`You have ${dueHabits.length} habit(s) due today.`, "success");
          if (notificationStatus === "granted" && typeof window !== "undefined") {
            new Notification("Habit Harbor", {
              body: `You have ${dueHabits.length} habit(s) due today.`
            });
          }
        }

        setLastReminderKey(todayKey);
      }
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, [
    reminderEnabled,
    reminderTime,
    habits,
    getScheduleDays,
    isCompletedToday,
    getDateKey,
    lastReminderKey,
    notificationStatus,
    showToast
  ]);

  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + calendarOffset, 1);
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const monthEnd = new Date(viewYear, viewMonth + 1, 0);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();

  const completionMap = useMemo(() => {
    const map = {};
    const sourceHabits =
      calendarHabitId === "all"
        ? habits
        : habits.filter((habit) => habit._id === calendarHabitId);

    sourceHabits.forEach((habit) => {
      (habit.completedDates || []).forEach((date) => {
        const parsed = new Date(date);
        if (parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth) {
          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(
            parsed.getDate()
          ).padStart(2, "0")}`;
          map[key] = (map[key] || 0) + 1;
        }
      });
    });
    return map;
  }, [habits, viewMonth, viewYear, calendarHabitId]);

  const calendarCells = useMemo(() => {
    const placeholders = Array.from({ length: firstWeekday }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, index) => index + 1);
    return [...placeholders, ...days];
  }, [daysInMonth, firstWeekday]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" />
          <span className="brand-name">Habit Harbor</span>
        </div>
        <button className="ghost-btn" onClick={logout}>
          Log out
        </button>
      </header>

      {!isOnline && (
        <div className="offline-banner">You are offline. Changes will sync later.</div>
      )}

      <main className="page">
        <section className="insight-grid">
          <div className="panel">
            <h2>Profile</h2>
            <p>Your account snapshot and current focus.</p>
            <div className="profile-card">
              <div className="profile-avatar">
                {profile?.name ? profile.name.slice(0, 1).toUpperCase() : "H"}
              </div>
              <div>
                <span className="profile-name">
                  {profile?.name || "Habit Builder"}
                </span>
                <span className="habit-sub">
                  {profile?.email || "Add an email by signing in."}
                </span>
                <span className="profile-meta">
                  {totalHabits} habits · {completedToday} completed today
                </span>
              </div>
            </div>
            <div className="badge-row">
              {badges.length === 0 ? (
                <span className="habit-sub">No badges yet. Keep going!</span>
              ) : (
                badges.map((badge) => (
                  <span key={badge} className="pill">
                    {badge}
                  </span>
                ))
              )}
            </div>
            <div className="profile-row">
              <div>
                <span className="habit-sub">Focus category</span>
                <span className="profile-highlight">
                  {habits[0]?.category || "General"}
                </span>
              </div>
              <div>
                <span className="habit-sub">Reminder</span>
                <span className="profile-highlight">
                  {reminderEnabled ? reminderTime : "Off"}
                </span>
              </div>
            </div>
            <div className="profile-form">
              <div className="input-group">
                <label htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="input-group">
                <label htmlFor="profile-phone">Phone (for SMS)</label>
                <input
                  id="profile-phone"
                  placeholder="+15551234567"
                  value={profileForm.phone}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div className="input-group">
                <label htmlFor="profile-timezone">Timezone</label>
                <div className="goal-row">
                  <input
                    id="profile-timezone"
                    value={profileForm.timezone}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, timezone: e.target.value }))
                    }
                  />
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() =>
                      setProfileForm((prev) => ({
                        ...prev,
                        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                      }))
                    }
                  >
                    Use my timezone
                  </button>
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="profile-reminder">Reminder time</label>
                <input
                  id="profile-reminder"
                  type="time"
                  value={profileForm.reminderTime}
                  onChange={(e) =>
                    setProfileForm((prev) => ({ ...prev, reminderTime: e.target.value }))
                  }
                />
              </div>
              <div className="reminder-actions">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={profileForm.reminderEnabled}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        reminderEnabled: e.target.checked
                      }))
                    }
                  />
                  Enable reminders
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={profileForm.reminderChannels.email}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        reminderChannels: {
                          ...prev.reminderChannels,
                          email: e.target.checked
                        }
                      }))
                    }
                  />
                  Email
                </label>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={profileForm.reminderChannels.sms}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        reminderChannels: {
                          ...prev.reminderChannels,
                          sms: e.target.checked
                        }
                      }))
                    }
                  />
                  SMS
                </label>
              </div>
              <button
                className="primary-btn"
                type="button"
                onClick={saveProfile}
                disabled={profileSaving}
              >
                {profileSaving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </div>
          <div className="panel">
            <h2>Today's focus</h2>
            <p>Habits due today and progress so far.</p>
            <div className="focus-grid">
              <div>
                <span className="habit-sub">Due today</span>
                <span className="focus-value">{dueToday}</span>
              </div>
              <div>
                <span className="habit-sub">Completed</span>
                <span className="focus-value">{completedToday}</span>
              </div>
              <div>
                <span className="habit-sub">Completion rate</span>
                <span className="focus-value">{weeklyStats.rate}%</span>
              </div>
            </div>
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <h3>Total habits</h3>
            <span>{totalHabits}</span>
          </div>
          <div className="stat-card">
            <h3>Due today</h3>
            <span>{dueToday}</span>
          </div>
          <div className="stat-card">
            <h3>Done today</h3>
            <span>{completedToday}</span>
          </div>
        </section>

        <section className="stats">
          <div className="stat-card">
            <h3>7-day completions</h3>
            <span>{weeklyStats.totalCompleted}</span>
          </div>
          <div className="stat-card">
            <h3>7-day due</h3>
            <span>{weeklyStats.totalDue}</span>
          </div>
          <div className="stat-card">
            <h3>Completion rate</h3>
            <span>{weeklyStats.rate}%</span>
          </div>
        </section>

        <section className="insight-grid">
          <div className="panel">
            <h2>Weekly trend</h2>
            <p>Due vs. completed habits over the last 7 days.</p>
            <div className="trend-chart">
              {weeklyTrend.map((day) => (
                <div className="trend-row" key={day.label}>
                  <span className="trend-label">{day.label}</span>
                  <div className="trend-bar">
                    <div
                      className="trend-due"
                      style={{ width: `${(day.due / weeklyMax) * 100}%` }}
                    />
                    <div
                      className="trend-completed"
                      style={{ width: `${(day.completed / weeklyMax) * 100}%` }}
                    />
                  </div>
                  <span className="trend-count">
                    {day.completed}/{day.due}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Daily reminders</h2>
            <p>Get a gentle nudge when habits are still due today.</p>
            <div className="input-group">
              <label htmlFor="reminder-time">Reminder time</label>
              <input
                id="reminder-time"
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </div>
            <div className="reminder-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={() => setReminderEnabled((prev) => !prev)}
              >
                {reminderEnabled ? "Disable reminders" : "Enable reminders"}
              </button>
              <button className="ghost-btn" type="button" onClick={requestNotifications}>
                {notificationStatus === "granted" ? "Notifications on" : "Enable notifications"}
              </button>
            </div>
            <p className="habit-sub">
              Status: {notificationStatus === "unsupported" ? "Unsupported" : notificationStatus}
            </p>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="panel">
            <h2>Add a habit</h2>
            <p>Name it, categorize it, and pick the days you will do it.</p>
            <form className="habit-form" onSubmit={addHabit}>
              <div className="input-group">
                <label htmlFor="habit-title">Habit name</label>
                <input
                  id="habit-title"
                  placeholder="Read 20 pages"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="habit-category">Category</label>
                <input
                  id="habit-category"
                  placeholder="Wellness, Focus, Fitness"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="habit-group">Group</label>
                <select
                  id="habit-group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                >
                  {groupOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Schedule days</label>
                <div className="schedule-grid">
                  {dayOptions.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      className={`day-toggle ${
                        scheduleDays.includes(day.value) ? "active" : ""
                      }`}
                      onClick={() => toggleDay(day.value, scheduleDays, setScheduleDays)}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="goal-type">Goal</label>
                <div className="goal-row">
                  <select
                    id="goal-type"
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value)}
                  >
                    {goalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={goalType === "daily" ? 1 : goalTarget}
                    onChange={(e) => setGoalTarget(Number(e.target.value))}
                    disabled={goalType === "daily"}
                  />
                </div>
              </div>
              <button className="primary-btn" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Add habit"}
              </button>
            </form>

            <div className="filters">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "completed", label: "Completed today" }
              ].map((chip) => (
                <button
                  key={chip.key}
                  className={`chip ${filter === chip.key ? "active" : ""}`}
                  onClick={() => setFilter(chip.key)}
                  type="button"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="filters">
              {groupList.map((item) => (
                <button
                  key={item}
                  className={`chip ${groupFilter === item ? "active" : ""}`}
                  onClick={() => setGroupFilter(item)}
                  type="button"
                >
                  {item === "all" ? "All groups" : item}
                </button>
              ))}
            </div>

            {error && <p className="habit-sub">{error}</p>}
          </div>

          <div className="panel">
            <h2>Explore habits</h2>
            <p>Search by name or category to find what you need.</p>
            <div className="input-group">
              <label htmlFor="habit-search">Search</label>
              <input
                id="habit-search"
                placeholder="Type to filter"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="habit-list">
              {filteredHabits.length === 0 ? (
                <div className="empty-state">
                  {loading ? "Loading habits..." : "No habits match this view yet."}
                </div>
              ) : (
                filteredHabits.map((habit) => {
                  const completedTodayFlag = isCompletedToday(habit);
                  const lastCompleted = getLastCompleted(habit);
                  const completedCount = habit.completedDates?.length || 0;
                  const schedule = getScheduleDays(habit);
                  const dueTodayFlag = schedule.includes(new Date().getDay());
                  const streaks = getStreaks(habit);
                  const isEditing = editingId === habit._id;
                  const weeklyCount = countWeeklyCompletions(habit);
                  const target = habit.goalType === "daily" ? 1 : habit.goalTarget || 3;
                  const goalProgress = habit.goalType === "daily"
                    ? `${completedTodayFlag ? 1 : 0}/${target}`
                    : `${weeklyCount}/${target}`;

                  return (
                    <div className="habit-card" key={habit._id}>
                      <div className="habit-meta">
                        {isEditing ? (
                          <div className="edit-form">
                            <div className="input-group">
                              <label htmlFor={`edit-title-${habit._id}`}>Habit name</label>
                              <input
                                id={`edit-title-${habit._id}`}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                              />
                            </div>
                            <div className="input-group">
                              <label htmlFor={`edit-category-${habit._id}`}>Category</label>
                              <input
                                id={`edit-category-${habit._id}`}
                                value={editCategory}
                                onChange={(e) => setEditCategory(e.target.value)}
                              />
                            </div>
                            <div className="input-group">
                              <label htmlFor={`edit-group-${habit._id}`}>Group</label>
                              <select
                                id={`edit-group-${habit._id}`}
                                value={editGroup}
                                onChange={(e) => setEditGroup(e.target.value)}
                              >
                                {groupOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="input-group">
                              <label>Schedule days</label>
                              <div className="schedule-grid">
                                {dayOptions.map((day) => (
                                  <button
                                    key={day.value}
                                    type="button"
                                    className={`day-toggle ${
                                      editScheduleDays.includes(day.value) ? "active" : ""
                                    }`}
                                    onClick={() =>
                                      toggleDay(day.value, editScheduleDays, setEditScheduleDays)
                                    }
                                  >
                                    {day.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="input-group">
                              <label htmlFor={`edit-goal-${habit._id}`}>Goal</label>
                              <div className="goal-row">
                                <select
                                  id={`edit-goal-${habit._id}`}
                                  value={editGoalType}
                                  onChange={(e) => setEditGoalType(e.target.value)}
                                >
                                  {goalOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min="1"
                                  max="14"
                                  value={editGoalType === "daily" ? 1 : editGoalTarget}
                                  onChange={(e) => setEditGoalTarget(Number(e.target.value))}
                                  disabled={editGoalType === "daily"}
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="habit-title">{habit.title}</span>
                            <span className="habit-sub">
                              {habit.group || "Personal"} · {habit.category || "General"} · {completedCount} total completions
                            </span>
                            <span className="habit-sub">
                              Goal: {habit.goalType || "weekly"} · {goalProgress}
                            </span>
                            <span className="habit-sub">
                              Streak: {streaks.current} current · {streaks.best} best
                            </span>
                            {lastCompleted && (
                              <span className="habit-sub">
                                Last completed: {lastCompleted.toLocaleDateString("en-US")}
                              </span>
                            )}
                            <span className="pill">
                              {completedTodayFlag
                                ? "Completed today"
                                : dueTodayFlag
                                ? "Due today"
                                : "Not due today"}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="habit-actions">
                        {isEditing ? (
                          <>
                            <button
                              className="primary-btn"
                              onClick={() => saveEdit(habit._id)}
                            >
                              Save
                            </button>
                            <button className="ghost-btn" onClick={cancelEdit}>
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="primary-btn"
                              onClick={() => {
                                if (!completedTodayFlag) {
                                  completeHabit(habit._id);
                                }
                              }}
                              disabled={completedTodayFlag || !dueTodayFlag}
                            >
                              {completedTodayFlag ? "Done" : dueTodayFlag ? "Mark done" : "Not due"}
                            </button>
                            <button className="ghost-btn" onClick={() => startEdit(habit)}>
                              Edit
                            </button>
                            <button
                              className="ghost-btn danger"
                              onClick={() => deleteHabit(habit._id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="panel calendar-panel">
          <div className="calendar-header">
            <div>
              <h2>Completion calendar</h2>
              <p>Daily totals for this month across your habits.</p>
            </div>
            <div className="calendar-actions">
              <select
                value={calendarHabitId}
                onChange={(e) => setCalendarHabitId(e.target.value)}
              >
                <option value="all">All habits</option>
                {habits.map((habit) => (
                  <option key={habit._id} value={habit._id}>
                    {habit.title}
                  </option>
                ))}
              </select>
              <div className="calendar-nav">
                <button className="ghost-btn" onClick={() => setCalendarOffset((v) => v - 1)}>
                  Prev
                </button>
                <span className="pill">
                  {monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
                <button className="ghost-btn" onClick={() => setCalendarOffset((v) => v + 1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
          <div className="calendar-grid">
            {dayOptions.map((day) => (
              <div key={day.label} className="calendar-label">
                {day.label}
              </div>
            ))}

            {calendarCells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="calendar-cell empty" />;
              }
              const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(
                day
              ).padStart(2, "0")}`;
              const count = completionMap[key] || 0;
              const isToday = isSameDay(new Date(viewYear, viewMonth, day), today);

              return (
                <div
                  key={key}
                  className={`calendar-cell ${count > 0 ? "active" : ""} ${
                    isToday ? "today" : ""
                  }`}
                >
                  <span className="calendar-day">{day}</span>
                  {count > 0 && <span className="calendar-count">{count}</span>}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {toast && (
        <div className={`toast ${toast.tone === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      )}

      <footer className="footer">Keep going, even on the slow days.</footer>
    </div>
  );
}

export default Dashboard;
