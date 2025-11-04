// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://finance-backend-u1ox.onrender.com";

function App() {
  const tg = window.Telegram?.WebApp;

  const [balance, setBalance] = useState(null);
  const [currency, setCurrency] = useState("₽");
  const [report, setReport] = useState(null);
  const [records, setRecords] = useState([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [tempCurrency, setTempCurrency] = useState("₽");
  const [tempBalance, setTempBalance] = useState("");
  const [loading, setLoading] = useState(true);

  // ================= Загрузка данных =================
  useEffect(() => {
    if (tg) tg.expand();

    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return setLoading(false);

    // Загружаем данные пользователя
    fetch(`${BACKEND_URL}/api/get_user?user_id=${user_id}`)
      .then((res) => res.json())
      .then((user) => {
        if (user && user.start_balance !== undefined) {
          setCurrency(user.currency);
          setBalance(user.start_balance);
          setIsFirstVisit(user.start_balance === 0);
        } else {
          setIsFirstVisit(true);
        }
      })
      .then(() => {
        // После загрузки пользователя — грузим отчёт и операции
        Promise.all([
          fetch(`${BACKEND_URL}/api/report?period=year&user_id=${user_id}`).then((r) => r.json()),
          fetch(`${BACKEND_URL}/api/records?user_id=${user_id}`).then((r) => r.json()),
        ])
          .then(([reportData, recordsData]) => {
            setBalance(
              (reportData.income || 0) - (reportData.expense || 0)
            );
            setRecords(recordsData);
          })
          .finally(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  // ================= Сохранение стартовых данных =================
  const handleSaveStartData = async () => {
    if (!tempBalance || isNaN(tempBalance))
      return alert("Введите корректный баланс");
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return alert("Открой приложение через Telegram.");

    try {
      await fetch(`${BACKEND_URL}/api/init_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          currency: tempCurrency,
          start_balance: parseFloat(tempBalance),
        }),
      });
      setCurrency(tempCurrency);
      setBalance(parseFloat(tempBalance));
      setIsFirstVisit(false);
    } catch {
      alert("Ошибка при сохранении данных");
    }
  };

  // ================= Добавление записи =================
  const handleAddRecord = async (type, amount) => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return alert("Открой через Telegram-бота.");

    try {
      const res = await fetch(`${BACKEND_URL}/api/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount, currency, user_id }),
      });
      if (!res.ok) throw new Error();
      alert(`✅ Добавлено: ${type === "income" ? "доход" : "расход"} ${amount} ${currency}`);
      fetchBalance();
      fetchRecords();
    } catch {
      alert("Ошибка при добавлении записи");
    }
  };

  // ================= Получение отчёта =================
  const fetchReport = async (period) => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/report?period=${period}&user_id=${user_id}`);
      const data = await res.json();
      setReport(data);
    } catch {
      alert("Ошибка при получении отчёта");
    }
  };

  // ================= Получение списка операций =================
  const fetchRecords = async () => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/records?user_id=${user_id}`);
      const data = await res.json();
      setRecords(data);
    } catch {
      console.error("Ошибка при загрузке операций");
    }
  };

  // ================= Обновление баланса =================
  const fetchBalance = async () => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return;
    const res = await fetch(`${BACKEND_URL}/api/report?period=year&user_id=${user_id}`);
    const data = await res.json();
    setBalance((data.income || 0) - (data.expense || 0));
  };

  // ================= Редактирование записи =================
  const handleEditRecord = async (record) => {
    const newAmount = parseFloat(prompt("Введите новую сумму:", record.amount));
    if (!newAmount) return;
    try {
      await fetch(`${BACKEND_URL}/api/update/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: newAmount }),
      });
      alert("✅ Запись обновлена");
      fetchRecords();
      fetchBalance();
    } catch {
      alert("Ошибка при обновлении");
    }
  };

  // ================= Приветственный экран =================
  if (isFirstVisit) {
    return (
      <div className="App" style={{ padding: "20px", fontFamily: "sans-serif" }}>
        <h1>👋 Добро пожаловать!</h1>
        <p>Выберите валюту и стартовый баланс:</p>
        <div>
          <label>Валюта: </label>
          <select
            value={tempCurrency}
            onChange={(e) => setTempCurrency(e.target.value)}
          >
            <option value="₽">₽</option>
            <option value="$">$</option>
            <option value="€">€</option>
          </select>
        </div>
        <div style={{ marginTop: 10 }}>
          <label>Стартовый баланс: </label>
          <input
            type="number"
            value={tempBalance}
            onChange={(e) => setTempBalance(e.target.value)}
          />
        </div>
        <button onClick={handleSaveStartData} style={{ marginTop: 20 }}>
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
          <>Баланс: <strong>{balance} {currency}</strong></>
        )}
      </div>

      {/* === Кнопки добавления === */}
      <div style={{ display: "flex", gap: "10px", margin: "20px 0" }}>
        <button
          onClick={() => {
            const amount = parseFloat(prompt("Введите сумму дохода:", "100"));
            if (amount) handleAddRecord("income", amount);
          }}
          style={{ flex: 1, padding: "10px", borderRadius: "8px" }}
        >
          ➕ Доход
        </button>
        <button
          onClick={() => {
            const amount = parseFloat(prompt("Введите сумму расхода:", "100"));
            if (amount) handleAddRecord("expense", amount);
          }}
          style={{ flex: 1, padding: "10px", borderRadius: "8px" }}
        >
          ➖ Расход
        </button>
      </div>

      {/* === Кнопки отчётов === */}
      <div style={{ display: "flex", gap: "10px", margin: "20px 0" }}>
        <button onClick={() => fetchReport("day")} style={{ flex: 1 }}>Сутки</button>
        <button onClick={() => fetchReport("week")} style={{ flex: 1 }}>Неделя</button>
        <button onClick={() => fetchReport("month")} style={{ flex: 1 }}>Месяц</button>
        <button onClick={() => fetchReport("year")} style={{ flex: 1 }}>Год</button>
      </div>

      {/* === Отчёт === */}
      {report && (
        <div
          style={{
            backgroundColor: "#f0f8ff",
            padding: 15,
            borderRadius: 10,
            marginTop: 20,
          }}
        >
          <h3>📊 Отчёт ({report.period_label})</h3>
          <p>Доход: {report.income} {currency}</p>
          <p>Расход: {report.expense} {currency}</p>
        </div>
      )}

      {/* === Список операций === */}
      <div style={{ marginTop: 30 }}>
        <h3>📜 Последние операции</h3>
        {records.length === 0 ? (
          <p>Нет операций</p>
        ) : (
          records.map((r) => (
            <div
              key={r.id}
              onClick={() => handleEditRecord(r)}
              style={{
                padding: "10px",
                margin: "5px 0",
                borderRadius: "8px",
                backgroundColor: r.type === "income" ? "#eaffea" : "#ffeaea",
                cursor: "pointer",
              }}
            >
              {r.type === "income" ? "➕" : "➖"} {r.amount} {currency}
              <div style={{ fontSize: "0.8rem", color: "#666" }}>
                {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
