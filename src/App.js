// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";
import { Home, List, BarChart3, Settings } from "lucide-react";

const BACKEND_URL = "https://finance-backend-u1ox.onrender.com";

// ✅ Добавляем стили прямо здесь, чтобы не было смещения
const appStyle = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  backgroundColor: "#f9fafb",
  alignItems: "center",
  justifyContent: "center",
  paddingBottom: "4rem",
};

const contentStyle = {
  width: "100%",
  maxWidth: "500px",
  flexGrow: 1,
};

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
      fetch(`${BACKEND_URL}/api/categories`).then(r => r.json()).catch(() => []),
    ])
      .then(([user, cats]) => {
        setCategories(cats || []);
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
        setBalance(
          (reportData.start_balance || 0) +
          (reportData.income || 0) - 
          (reportData.expense || 0)
        );
        setRecords(recordsData);
      })
      .catch(e => console.error("Ошибка загрузки:", e))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveStartData = async () => {
    if (!tempBalance || isNaN(tempBalance))
      return alert("Введите корректный баланс");
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return alert("Открой приложение через Telegram.");

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
      body: JSON.stringify({
        user_id,
        type,
        amount,
        currency,
        category_id: category_id || null,
        description,
      }),
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
      body: JSON.stringify({
        type: newType,
        amount: newAmount,
        description: newDesc,
        category_id: newCat || null,
      }),
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
    setBalance(
      (data.start_balance || 0) + (data.income || 0) - (data.expense || 0)
    );
  };

  const fetchReport = async (period) => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    const res = await fetch(`${BACKEND_URL}/api/report?period=${period}&user_id=${user_id}`);
    const data = await res.json();
    setReport({
      ...data,
      balance:
        (data.start_balance || 0) + (data.income || 0) - (data.expense || 0),
    });
  };

  if (loading) return <div className="App p-4">Загрузка...</div>;

  if (isFirstVisit)
    return (
      <div style={appStyle}>
        <div style={contentStyle} className="App p-4 text-center">
          <h1>👋 Добро пожаловать!</h1>
          <p>Введите валюту и стартовый баланс:</p>
          <select
            value={tempCurrency}
            onChange={(e) => setTempCurrency(e.target.value)}
            className="border rounded p-2"
          >
            <option value="₽">₽</option>
            <option value="$">$</option>
            <option value="€">€</option>
          </select>
          <input
            type="number"
            value={tempBalance}
            onChange={(e) => setTempBalance(e.target.value)}
            placeholder="Баланс"
            className="border rounded p-2 mx-2"
          />
          <button
            onClick={handleSaveStartData}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Сохранить
          </button>
        </div>
      </div>
    );

  const renderContent = () => {
    switch (tab) {
      case "home":
        return (
          <div style={contentStyle} className="p-4 pb-20">
            <h2 className="text-lg font-semibold">
              💰 Баланс: {balance} {currency}
            </h2>

            <div className="flex gap-2 my-4">
              <button
                onClick={() => handleAddRecord("income")}
                className="flex-1 bg-green-500 text-white py-2 rounded"
              >
                ➕ Доход
              </button>
              <button
                onClick={() => handleAddRecord("expense")}
                className="flex-1 bg-red-500 text-white py-2 rounded"
              >
                ➖ Расход
              </button>
            </div>

            <h3 className="text-md font-semibold mb-2">📜 Последние операции</h3>
            {records.length === 0 ? (
              <p>Нет операций</p>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleEditRecord(r)}
                  className={`p-3 mb-2 rounded cursor-pointer ${
                    r.type === "income" ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {r.type === "income" ? "➕" : "➖"} {r.amount} {currency}{" "}
                  {r.category_name && `(${r.category_name})`}
                  <div className="text-xs text-gray-500">
                    {r.description || "—"} |{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "records":
        return (
          <div style={contentStyle} className="p-4 pb-20">
            <h2 className="text-lg font-semibold mb-2">📋 Все операции</h2>
            {records.length === 0 ? (
              <p>Нет операций</p>
            ) : (
              records.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleEditRecord(r)}
                  className={`p-3 mb-2 rounded cursor-pointer ${
                    r.type === "income" ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {r.type === "income" ? "➕" : "➖"} {r.amount} {currency}{" "}
                  {r.category_name && `(${r.category_name})`}
                  <div className="text-xs text-gray-500">
                    {r.description || "—"} |{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "reports":
        return (
          <div style={contentStyle} className="p-4 pb-20">
            <h2 className="text-lg font-semibold">📊 Отчёт</h2>
            <div className="flex gap-2 my-2">
              <button onClick={() => fetchReport("day")} className="flex-1 bg-gray-100 rounded py-2">
                Сутки
              </button>
              <button onClick={() => fetchReport("week")} className="flex-1 bg-gray-100 rounded py-2">
                Неделя
              </button>
              <button onClick={() => fetchReport("month")} className="flex-1 bg-gray-100 rounded py-2">
                Месяц
              </button>
              <button onClick={() => fetchReport("year")} className="flex-1 bg-gray-100 rounded py-2">
                Год
              </button>
            </div>

            {report && (
              <div className="bg-blue-50 p-4 rounded mt-3">
                <p><b>Период:</b> {report.period_label}</p>
                <p>Доход: {report.income} {currency}</p>
                <p>Расход: {report.expense} {currency}</p>
                <p>Баланс: {report.balance} {currency}</p>
              </div>
            )}
          </div>
        );

      case "settings":
        return (
          <div style={contentStyle} className="p-4 pb-20">
            <h2 className="text-lg font-semibold mb-2">⚙️ Настройки</h2>
            <p>Валюта: {currency}</p>
            <p>Стартовый баланс: {balance}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={appStyle}>
      <div style={contentStyle}>{renderContent()}</div>

      {/* Нижняя панель навигации */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-sm flex justify-around items-center py-2">
        <button onClick={() => setTab("home")} className={`flex flex-col items-center text-sm ${tab === "home" ? "text-blue-600" : "text-gray-500"}`}>
          <Home size={22} />
          <span>Главная</span>
        </button>

        <button onClick={() => setTab("records")} className={`flex flex-col items-center text-sm ${tab === "records" ? "text-blue-600" : "text-gray-500"}`}>
          <List size={22} />
          <span>Операции</span>
        </button>

        <button onClick={() => setTab("reports")} className={`flex flex-col items-center text-sm ${tab === "reports" ? "text-blue-600" : "text-gray-500"}`}>
          <BarChart3 size={22} />
          <span>Отчёты</span>
        </button>

        <button onClick={() => setTab("settings")} className={`flex flex-col items-center text-sm ${tab === "settings" ? "text-blue-600" : "text-gray-500"}`}>
          <Settings size={22} />
          <span>Настройки</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
