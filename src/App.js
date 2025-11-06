// src/App.js
import React, { useEffect, useState } from "react";
import "./App.css";
import { Home, List, BarChart3, Settings, Eye, EyeOff, X } from "lucide-react";

const BACKEND_URL = "https://finance-backend-u1ox.onrender.com";

const appStyle = {
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  backgroundColor: "#f9fafb",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingBottom: "4rem",
};

const contentStyle = {
  width: "100%",
  maxWidth: "500px",
  flexGrow: 1,
  paddingTop: "70px",
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
  const [hideBalance, setHideBalance] = useState(false);

  // ✅ для модалки добавления записи
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("income");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (tg) tg.expand();
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return setLoading(false);

    Promise.all([
      fetch(`${BACKEND_URL}/api/get_user?user_id=${user_id}`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/categories`).then((r) => r.json()).catch(() => []),
    ])
      .then(([user, cats]) => {
        setCategories(cats || []);
        if (user && user.start_balance !== undefined) {
          setCurrency(user.currency);
          setBalance(user.start_balance);
          setIsFirstVisit(user.start_balance === 0);
        }
        return Promise.all([
          fetch(`${BACKEND_URL}/api/report?period=year&user_id=${user_id}`).then((r) => r.json()),
          fetch(`${BACKEND_URL}/api/records?user_id=${user_id}`).then((r) => r.json()),
        ]);
      })
      .then(([reportData, recordsData]) => {
        setBalance(
          (reportData.start_balance || 0) + (reportData.income || 0) - (reportData.expense || 0)
        );
        setRecords(recordsData);
      })
      .catch((e) => console.error("Ошибка загрузки:", e))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveStartData = async () => {
    if (!tempBalance || isNaN(tempBalance)) return alert("Введите корректный баланс");
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

  // ✅ Новая функция добавления через модалку
  const openAddModal = (type) => {
    setModalType(type);
    setShowModal(true);
    setAmount("");
    setSelectedCategory("");
    setDescription("");
  };

  const handleAddRecord = async () => {
    const user_id = tg?.initDataUnsafe?.user?.id;
    if (!user_id) return alert("Открой приложение через Telegram.");

    if (!amount || isNaN(amount)) return alert("Введите корректную сумму");
    if (!selectedCategory) return alert("Выберите категорию");

    await fetch(`${BACKEND_URL}/api/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id,
        type: modalType,
        amount: parseFloat(amount),
        currency,
        category_id: selectedCategory,
        description,
      }),
    });

    setShowModal(false);
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
    setBalance((data.start_balance || 0) + (data.income || 0) - (data.expense || 0));
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
          <select value={tempCurrency} onChange={(e) => setTempCurrency(e.target.value)}>
            <option value="₽">₽</option>
            <option value="$">$</option>
            <option value="€">€</option>
          </select>
          <input
            type="number"
            value={tempBalance}
            onChange={(e) => setTempBalance(e.target.value)}
            placeholder="Баланс"
          />
          <button onClick={handleSaveStartData}>Сохранить</button>
        </div>
      </div>
    );

  const renderContent = () => {
    switch (tab) {
      case "home":
        return (
          <div className="p-4 pb-20">
            <div className="flex gap-2 my-4">
              <button onClick={() => openAddModal("income")} className="flex-1 bg-green-500 text-white py-2 rounded">
                ➕ Доход
              </button>
              <button onClick={() => openAddModal("expense")} className="flex-1 bg-red-500 text-white py-2 rounded">
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
                    {r.description || "—"} | {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "records":
        return (
          <div className="p-4 pb-20">
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
                    {r.description || "—"} | {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "reports":
        return (
          <div className="p-4 pb-20">
            <h2 className="text-lg font-semibold">📊 Отчёт</h2>
            <div className="flex gap-2 my-2">
              {["day", "week", "month", "year"].map((p) => (
                <button key={p} onClick={() => fetchReport(p)} className="flex-1 bg-gray-100 rounded py-2 capitalize">
                  {p === "day" ? "Сутки" : p === "week" ? "Неделя" : p === "month" ? "Месяц" : "Год"}
                </button>
              ))}
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
          <div className="p-4 pb-20">
            <h2 className="text-lg font-semibold mb-2">⚙️ Настройки</h2>
            <p>Валюта: {currency}</p>
            <p>Текущий баланс: {balance}</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={appStyle}>
      {(tab === "home" || tab === "records") && (
        <header className="fixed top-0 left-0 w-full h-14 bg-gradient-to-r from-blue-500 to-blue-400 text-white flex justify-center items-center px-4 shadow-md z-10">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <span>
              Баланс: {hideBalance ? "****" : `${balance?.toLocaleString()} ${currency}`}
            </span>
            <button
              onClick={() => setHideBalance(!hideBalance)}
              className="text-white/90 hover:text-white focus:outline-none"
              style={{ padding: 0, margin: 0 }}
            >
              {hideBalance ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </header>
      )}

      <div style={contentStyle}>{renderContent()}</div>

      {/* ✅ Модальное окно добавления */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-11/12 max-w-md p-5 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={22} />
            </button>
            <h2 className="text-xl font-semibold mb-4">
              {modalType === "income" ? "Добавление дохода" : "Добавление расхода"}
            </h2>

            <label className="block text-sm text-gray-700 mb-1">Введите сумму:</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Сумма"
              className="w-full border rounded-lg p-2 mb-3"
            />

            <label className="block text-sm text-gray-700 mb-1">Выберите категорию:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border rounded-lg p-2 mb-3"
            >
              <option value="">Выберите категорию</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label className="block text-sm text-gray-700 mb-1">Введите описание:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание"
              className="w-full border rounded-lg p-2 mb-4"
            />

            <button
              onClick={handleAddRecord}
              className={`w-full py-2 rounded-lg text-white ${
                modalType === "income" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Нижняя навигация */}
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
