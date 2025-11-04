// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://finance-backend-u1ox.onrender.com";

function App() {
  const tg = window.Telegram?.WebApp;

  const [tab, setTab] = useState("home");
  const [balance, setBalance] = useState(null);
  const [currency, setCurrency] = useState("₽");
  const [report, setReport] = useState(null);
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [tempCurrency, setTempCurrency] = useState("₽");
  const [tempBalance, setTempBalance] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tg) tg.expand();

    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return setLoading(false);

    Promise.all([
      fetch(`${BACKEND_URL}/api/get_user?user_id=${user_id}`).then(r => r.json()),
      fetch(`${BACKEND_URL}/api/categories`).then(r => r.json()),
    ])
      .then(([user, cats]) => {
        setCategories(cats);
        if (user && user.start_balance !== undefined) {
          setCurrency(user.currency);
          setBalance(user.start_balance);
          setIsFirstVisit(user.start_balance === 0);
        }
        return Promise.all([
          fetch(`${BACKEND_URL}/api/report?period=year&user_id=${user_id}`).then(r => r.json()),
          fetch(`${BACKEND_URL}/api/records?user_id=${user_id}`).then(r => r.json()),
        ]);
      })
      .then(([reportData, recordsData]) => {
        setBalance((reportData.start_balance || 0) + (reportData.income || 0) - (reportData.expense || 0));
        setRecords(recordsData);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveStartData = async () => {
    if (!tempBalance || isNaN(tempBalance)) return alert("Введите корректный баланс");
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return alert("Открой приложение через Telegram.");
    await fetch(`${BACKEND_URL}/api/init_user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, currency: tempCurrency, start_balance: parseFloat(tempBalance) }),
    });
    setCurrency(tempCurrency);
    setBalance(parseFloat(tempBalance));
    setIsFirstVisit(false);
  };

  const handleAddRecord = async (type) => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    const amount = parseFloat(prompt("Введите сумму:", "100"));
    if (!amount) return;

    const category_id = prompt("Введите ID категории (или оставьте пустым):");
    const description = prompt("Введите описание:");

    await fetch(`${BACKEND_URL}/api/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, type, amount, currency, category_id: category_id || null, description }),
    });
    alert("✅ Добавлено!");
    fetchRecords();
    fetchBalance();
  };

  const handleEditRecord = async (r) => {
    const newAmount = parseFloat(prompt("Новая сумма:", r.amount));
    if (!newAmount) return;
    const newType = prompt("Тип (income/expense):", r.type);
    const newDesc = prompt("Описание:", r.description || "");
    const newCat = prompt("ID категории:", r.category_id || "");

    await fetch(`${BACKEND_URL}/api/update/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType, amount: newAmount, description: newDesc, category_id: newCat || null }),
    });
    alert("✅ Обновлено");
    fetchRecords();
    fetchBalance();
  };

  const fetchRecords = async () => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    const res = await fetch(`${BACKEND_URL}/api/records?user_id=${user_id}`);
    setRecords(await res.json());
  };

  const fetchBalance = async () => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    const res = await fetch(`${BACKEND_URL}/api/report?period=year&user_id=${user_id}`);
    const data = await res.json();
    setBalance((data.start_balance || 0) + (data.income || 0) - (data.expense || 0));
  };

  if (isFirstVisit)
    return (
      <div className="App" style={{ padding: 20 }}>
        <h1>👋 Добро пожаловать!</h1>
        <p>Введите валюту и стартовый баланс:</p>
        <select value={tempCurrency} onChange={e => setTempCurrency(e.target.value)}>
          <option value="₽">₽</option>
          <option value="$">$</option>
          <option value="€">€</option>
        </select>
        <input type="number" value={tempBalance} onChange={e => setTempBalance(e.target.value)} placeholder="Баланс" />
        <button onClick={handleSaveStartData}>Сохранить</button>
      </div>
    );

  return (
    <div className="App" style={{ padding: 20, fontFamily: "sans-serif" }}>
      {/* Навигация */}
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 20 }}>
        <button onClick={() => setTab("home")} style={{ flex: 1 }}>🏠 Главная</button>
        <button onClick={() => setTab("report")} style={{ flex: 1 }}>📊 Отчёт</button>
      </div>

      {tab === "home" ? (
        <>
          <h2>💰 Баланс: {balance} {currency}</h2>

          <div style={{ display: "flex", gap: 10, margin: "20px 0" }}>
            <button onClick={() => handleAddRecord("income")} style={{ flex: 1 }}>➕ Доход</button>
            <button onClick={() => handleAddRecord("expense")} style={{ flex: 1 }}>➖ Расход</button>
          </div>

          <h3>📜 Последние операции</h3>
          {records.length === 0 ? <p>Нет операций</p> : records.map(r => (
            <div key={r.id} onClick={() => handleEditRecord(r)} style={{
              padding: "10px",
              margin: "5px 0",
              borderRadius: "8px",
              backgroundColor: r.type === "income" ? "#eaffea" : "#ffeaea",
              cursor: "pointer"
            }}>
              {r.type === "income" ? "➕" : "➖"} {r.amount} {currency} {r.category_name && `(${r.category_name})`}
              <div style={{ fontSize: "0.8rem", color: "#666" }}>{r.description || "—"} | {new Date(r.created_at).toLocaleString()}</div>
            </div>
          ))}
        </>
      ) : (
        <>
          <h2>📊 Отчёт</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => fetchReport("day")}>Сутки</button>
            <button onClick={() => fetchReport("week")}>Неделя</button>
            <button onClick={() => fetchReport("month")}>Месяц</button>
            <button onClick={() => fetchReport("year")}>Год</button>
          </div>

          {report && (
            <div style={{ backgroundColor: "#f0f8ff", padding: 15, borderRadius: 10, marginTop: 20 }}>
              <p><b>Период:</b> {report.period_label}</p>
              <p>Доход: {report.income} {currency}</p>
              <p>Расход: {report.expense} {currency}</p>
              <p>Баланс: {report.balance} {currency}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;