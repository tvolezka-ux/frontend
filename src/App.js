import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const tg = window.Telegram?.WebApp;
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState("₽");
  const [report, setReport] = useState(null);

  // Инициализация Telegram WebApp
  useEffect(() => {
    if (tg) {
      tg.expand();
      tg.MainButton.text = "Добавить запись";
      tg.MainButton.show();
      tg.MainButton.onClick(() => handleAddRecord());
    }
  }, [tg]);

  // Добавление записи (пример)
  const handleAddRecord = async () => {
    try {
      const res = await fetch("https://your-backend-url.onrender.com/api/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 100, type: "income", currency }),
      });
      const data = await res.json();
      alert(`✅ Добавлено: ${data.status}`);
    } catch (error) {
      alert("Ошибка при добавлении записи");
    }
  };

  // Получение отчёта
  const fetchReport = async (period) => {
    try {
      const res = await fetch(
        `https://your-backend-url.onrender.com/api/report?period=${period}`
      );
      const data = await res.json();
      setReport(data);
    } catch (error) {
      alert("Ошибка при получении отчёта");
    }
  };

  return (
    <div className="App">
      <h1>💰 Финансы</h1>
      <h2>
        Баланс: {balance} {currency}
      </h2>

      <div className="buttons">
        <button onClick={() => fetchReport("day")}>Сутки</button>
        <button onClick={() => fetchReport("week")}>Неделя</button>
        <button onClick={() => fetchReport("month")}>Месяц</button>
        <button onClick={() => fetchReport("year")}>Год</button>
      </div>

      {report && (
        <div className="report">
          <h3>📊 Отчёт</h3>
          <p>
            Период: {report.start_date} — {report.end_date}
          </p>
          <pre>{JSON.stringify(report.data, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default App;
