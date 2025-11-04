// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://finance-backend-u1ox.onrender.com";

function App() {
  const tg = window.Telegram?.WebApp;

  const [balance, setBalance] = useState(null);
  const [currency, setCurrency] = useState("₽");
  const [report, setReport] = useState(null);
  const [operations, setOperations] = useState([]);
  const [editingOp, setEditingOp] = useState(null);
  const [loading, setLoading] = useState(true);

  const user_id = tg?.initDataUnsafe?.user?.id;

  // === Загрузка данных ===
  useEffect(() => {
    if (tg) tg.expand();
    if (user_id) {
      fetchAll();
    }
  }, []);

  const fetchAll = async () => {
    await Promise.all([fetchBalance(), fetchOperations()]);
    setLoading(false);
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/report?period=year&user_id=${user_id}`);
      const data = await res.json();
      setBalance((data.income || 0) - (data.expense || 0));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOperations = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/operations?user_id=${user_id}`);
      const data = await res.json();
      setOperations(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRecord = async (type) => {
    const amount = parseFloat(prompt(`Введите сумму для ${type === "income" ? "дохода" : "расхода"}:`));
    if (!amount) return;
    await fetch(`${BACKEND_URL}/api/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount, currency, user_id }),
    });
    fetchAll();
  };

  const handleUpdateOperation = async () => {
    if (!editingOp) return;
    await fetch(`${BACKEND_URL}/api/operations/${editingOp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: editingOp.type,
        amount: parseFloat(editingOp.amount),
      }),
    });
    setEditingOp(null);
    fetchAll();
  };

  return (
    <div className="App" style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>💰 Финансы</h1>

      <div style={{ padding: 15, backgroundColor: "#f5f5f5", borderRadius: 10 }}>
        {loading ? "Загрузка..." : <>Баланс: <strong>{balance} {currency}</strong></>}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={() => handleAddRecord("income")} style={{ flex: 1 }}>➕ Доход</button>
        <button onClick={() => handleAddRecord("expense")} style={{ flex: 1 }}>➖ Расход</button>
      </div>

      {/* ===== Список операций ===== */}
      <div style={{ marginTop: 25 }}>
        <h3>🧾 История операций</h3>
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {operations.map(op => (
            <div key={op.id}
              onClick={() => setEditingOp(op)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                backgroundColor: "#f9f9f9",
                padding: 10,
                marginBottom: 5,
                borderRadius: 8,
                cursor: "pointer"
              }}>
              <span>{op.type === "income" ? "➕" : "➖"} {op.amount} {currency}</span>
              <span style={{ fontSize: "0.8rem", color: "#777" }}>
                {new Date(op.created_at).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Модалка редактирования ===== */}
      {editingOp && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          justifyContent: "center", alignItems: "center"
        }}>
          <div style={{
            backgroundColor: "#fff", padding: 20, borderRadius: 10, width: "90%"
          }}>
            <h3>✏️ Редактировать операцию</h3>
            <label>Тип:</label>
            <select
              value={editingOp.type}
              onChange={e => setEditingOp({ ...editingOp, type: e.target.value })}
              style={{ width: "100%", marginBottom: 10 }}
            >
              <option value="income">Доход</option>
              <option value="expense">Расход</option>
            </select>

            <label>Сумма:</label>
            <input
              type="number"
              value={editingOp.amount}
              onChange={e => setEditingOp({ ...editingOp, amount: e.target.value })}
              style={{ width: "100%", marginBottom: 15 }}
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button onClick={handleUpdateOperation}>💾 Сохранить</button>
              <button onClick={() => setEditingOp(null)}>❌ Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
