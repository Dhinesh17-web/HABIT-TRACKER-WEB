"use strict";

const cron = require("node-cron");
const { DateTime } = require("luxon");
const sgMail = require("@sendgrid/mail");
const twilio = require("twilio");
const User = require("../models/User");
const Habit = require("../models/Habit");

const sendgridKey = process.env.SENDGRID_API_KEY;
const sendgridFrom = process.env.SENDGRID_FROM;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM;

if (sendgridKey) {
  sgMail.setApiKey(sendgridKey);
}

const twilioClient = twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;

const getTodayKey = (dt) => dt.toFormat("yyyy-LL-dd");

const isSameDay = (a, b) => a.hasSame(b, "day");

const getDueHabits = (habits, now) => {
  return habits.filter((habit) => habit.scheduleDays.includes(now.weekday % 7));
};

const countCompletedToday = (habit, now) => {
  return (habit.completedDates || []).some((date) => {
    const parsed = DateTime.fromJSDate(new Date(date));
    return isSameDay(parsed, now);
  });
};

const sendEmail = async (to, subject, text) => {
  if (!sendgridKey || !sendgridFrom) return false;
  await sgMail.send({ to, from: sendgridFrom, subject, text });
  return true;
};

const sendSms = async (to, body) => {
  if (!twilioClient || !twilioFrom) return false;
  await twilioClient.messages.create({ to, from: twilioFrom, body });
  return true;
};

const runReminderSweep = async () => {
  const users = await User.find({ reminderEnabled: true });

  for (const user of users) {
    const timezone = user.timezone || "UTC";
    const now = DateTime.now().setZone(timezone);
    if (!now.isValid) continue;

    const [hourStr, minuteStr] = (user.reminderTime || "20:00").split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr);

    if (Number.isNaN(hour) || Number.isNaN(minute)) continue;
    if (now.hour !== hour || now.minute !== minute) continue;

    const todayKey = getTodayKey(now);
    if (user.lastReminderKey === todayKey) continue;

    const habits = await Habit.find({ userId: user._id });
    const dueHabits = getDueHabits(habits, now);
    const pending = dueHabits.filter((habit) => !countCompletedToday(habit, now));

    if (pending.length === 0) {
      user.lastReminderKey = todayKey;
      await user.save();
      continue;
    }

    const message = `You have ${pending.length} habit(s) due today.`;
    const channels = user.reminderChannels || {};

    if (channels.email && user.email) {
      await sendEmail(user.email, "Habit Harbor Reminder", message).catch(() => {});
    }

    if (channels.sms && user.phone) {
      await sendSms(user.phone, message).catch(() => {});
    }

    user.lastReminderKey = todayKey;
    await user.save();
  }
};

const startReminderJob = () => {
  cron.schedule("*/1 * * * *", () => {
    runReminderSweep().catch(() => {});
  });
};

module.exports = startReminderJob;
