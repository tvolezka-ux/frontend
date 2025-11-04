// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://finance-backend-u1ox.onrender.com"; // твой backend на Render

function App() {
  const tg = window.Telegram?.WebApp;

  // ================= Состояния =================
  const [balance, setBalance] = useState(null); // 👈 изначально null, чтобы показать "Загрузка..."
  const [currency, setCurrency] = useState("₽");
  const [report, setReport] = useState(null);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [tempCurrency, setTempCurrency] = useState("₽");
  const [tempBalance, setTempBalance] = useState("");
  const [loading, setLoading] = useState(true); // 👈 индикатор загрузки баланса

  // ================= При загрузке =================
  useEffect(() => {
    if (tg) tg.expand();

    // Проверяем, есть ли сохранённые данные
    const savedCurrency = localStorage.getItem("currency");
    const savedBalance = localStorage.getItem("balance");
    const savedVisit = localStorage.getItem("isFirstVisit");

    if (savedVisit === "false" && savedCurrency && savedBalance) {
      setCurrency(savedCurrency);
      setBalance(parseFloat(savedBalance));
      setIsFirstVisit(false);
    }

    // 👇 Загружаем актуальный баланс с backend
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (user_id) {
      fetch(`${BACKEND_URL}/api/report?period=year&user_id=${user_id}`)
        .then((res) => res.json())
        .then((data) => {
          setBalance((data.income || 0) - (data.expense || 0));
        })
        .catch((err) => console.error("Ошибка при загрузке баланса:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ================= Добавление записи =================
  const handleAddRecord = async (type, amount) => {
    const user_id = tg?.initDataUnsafe?.user?.id;

    if (!user_id) {
      alert("❗ Открой приложение через Telegram-бота, а не напрямую.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount, currency, user_id }),
      });

      if (!res.ok) throw new Error("Ошибка запроса");

      const data = await res.json();
      alert(`✅ Добавлено: ${type === "income" ? "доход" : "расход"} ${amount} ${currency}`);
      fetchBalance(); // обновляем баланс после добавления
    } catch (error) {
      console.error("Ошибка при добавлении:", error);
      alert("Ошибка при добавлении записи");
    }
  };

  // ================= Получение отчёта =================
  const fetchReport = async (period) => {
    const user_id = tg?.initDataUnsafe?.user?.id;

    if (!user_id) {
      alert("❗ Ошибка: приложение запущено не из Telegram. Открой через бота.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/report?period=${period}&user_id=${user_id}`);
      if (!res.ok) throw new Error("Ошибка сервера");
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error("Ошибка при получении отчёта:", error);
      alert("Ошибка при получении отчёта");
    }
  };

  // ================= Обновление баланса =================
  const fetchBalance = async () => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/report?period=year&user_id=${user_id}`);
      const data = await res.json();
      setBalance((data.income || 0) - (data.expense || 0));
    } catch (error) {
      console.error("Ошибка при получении баланса:", error);
    }
  };

  // ================= Сохранение стартовых данных =================
  const handleSaveStartData = () => {
    if (!tempBalance || isNaN(tempBalance)) {
      alert("Введите корректный стартовый баланс");
      return;
    }

    setCurrency(tempCurrency);
    setBalance(parseFloat(tempBalance));
    setIsFirstVisit(false);

    // 🧠 сохраняем данные локально
    localStorage.setItem("currency", tempCurrency);
    localStorage.setItem("balance", tempBalance);
    localStorage.setItem("isFirstVisit", "false");
  };

  // ================= Приветственный экран =================
  if (isFirstVisit) {
    return (
      <div className="App" style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <h1>👋 Добро пожаловать!</h1>
        <p>Выберите валюту приложения и введите стартовый баланс:</p>

        <div style={{ margin: "10px 0" }}>
          <label>Валюта: </label>
          <select value={tempCurrency} onChange={(e) => setTempCurrency(e.target.value)}>
            <option value="₽">₽ (рубли)</option>
            <option value="$">$ (доллары)</option>
            <option value="€">€ (евро)</option>
          </select>
        </div>

        <div style={{ margin: "10px 0" }}>
          <label>Стартовый баланс: </label>
          <input
            type="number"
            value={tempBalance}
            onChange={(e) => setTempBalance(e.target.value)}
            placeholder="0"
          />
        </div>

        <button
          onClick={handleSaveStartData}
          style={{ padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}
        >
          Сохранить
        </button>
      </div>
    );
  }

  // ================= Основной экран =================
  return (
    <div className="App" style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>💰 Финансы</h1>

      <div
        className="balance-card"
        style={{
          padding: "15px",
          margin: "10px 0",
          backgroundColor: "#f5f5f5",
          borderRadius: "10px",
          fontSize: "1.2rem",
        }}
      >
        {loading ? (
          <strong>Загрузка баланса...</strong>
        ) : (
          <>
            Баланс: <strong>{balance} {currency}</strong>
          </>
        )}
      </div>

      <div className="menu-buttons" style={{ display: "flex", gap: "10px", margin: "20px 0" }}>
        <button
          onClick={() => {
            const amount = parseFloat(prompt("Введите сумму дохода:", "100"));
            if (amount) handleAddRecord("income", amount);
          }}
          style={{ flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer" }}
        >
          ➕ Доход
        </button>

        <button
          onClick={() => {
            const amount = parseFloat(prompt("Введите сумму расхода:", "100"));
            if (amount) handleAddRecord("expense", amount);
          }}
          style={{ flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer" }}
        >
          ➖ Расход
        </button>
      </div>

      <div className="report-buttons" style={{ display: "flex", gap: "10px", margin: "20px 0" }}>
        <button onClick={() => fetchReport("day")} style={{ flex: 1 }}>Сутки</button>
        <button onClick={() => fetchReport("week")} style={{ flex: 1 }}>Неделя</button>
        <button onClick={() => fetchReport("month")} style={{ flex: 1 }}>Месяц</button>
        <button onClick={() => fetchReport("year")} style={{ flex: 1 }}>Год</button>
      </div>

      {report && (
        <div
          className="report-card"
          style={{
            padding: "15px",
            backgroundColor: "#f0f8ff",
            borderRadius: "10px",
            marginTop: "20px",
          }}
        >
          <h3>📊 Отчёт ({report.period_label})</h3>
          <p>Доход: {report.income} {currency}</p>
          <p>Расход: {report.expense} {currency}</p>
          <pre>{JSON.stringify(report.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
