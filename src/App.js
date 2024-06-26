import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import HomePage from "./components/HomePage";
import TransactionForm from "./components/TransactionForm";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Footer from "./components/Footer";
import Dashboard from "./components/Dashboard";
import "bootstrap/dist/css/bootstrap.min.css";
import './App.css';

const apiConfig = {
  url: "https://json-storage-api.p.rapidapi.com/datalake",
  headers: {
    "content-type": "application/json",
    "X-RapidAPI-Key": "737b5b8023msh5dc8759b04faf33p1be655jsn98f86fc2f298",
    "X-RapidAPI-Host": "json-storage-api.p.rapidapi.com",
  },
};

const App = () => {
  const [balances, setBalances] = useState({
    checking: 0,
    savings: 0,
    creditCard: 0,
    investment: 0,
  });
  const [transactions, setTransactions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const authState = localStorage.getItem("isAuthenticated");
    if (authState) {
      setIsAuthenticated(JSON.parse(authState));
      const accountNumber = localStorage.getItem("accountNumber");
      if (accountNumber) {
        loadTransactions(accountNumber);
      }
    }
  }, []);

  const handleLogin = (accountNumber) => {
    setIsAuthenticated(true);
    localStorage.setItem("isAuthenticated", true);
    localStorage.setItem("accountNumber", accountNumber);
    loadTransactions(accountNumber); // Load transactions for logged-in user
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("accountNumber");
    setTransactions([]); // Clear transactions on logout
    setBalances({ checking: 0, savings: 0, creditCard: 0, investment: 0 }); // Reset balances
  };

  const saveTransactionToAPI = async (transaction) => {
    try {
      const response = await fetch(apiConfig.url, {
        method: "POST",
        headers: apiConfig.headers,
        body: JSON.stringify({
          "@context": [
            "http://schema4i.org/Thing.jsonld",
            "http://schema4i.org/Action.jsonld",
            "http://schema4i.org/CreateAction.jsonld",
          ],
          "@type": "CreateAction",
          Result: {
            "@context": [
              "http://schema4i.org/DataLakeItem.jsonld",
              "http://schema4i.org/UserAccount.jsonld",
            ],
            "@type": "DataLakeItem",
            Name: "Transaction",
            Creator: {
              "@type": "UserAccount",
              Identifier: localStorage.getItem("accountId"),
            },
            About: {
              "@type": "Transaction",
              ...transaction,
            },
          },
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to save transaction");
      }
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

  const loadTransactions = async (accountNumber) => {
    try {
      const response = await fetch(apiConfig.url, {
        method: "POST",
        headers: apiConfig.headers,
        body: JSON.stringify({
          "@context": [
            "http://schema4i.org/Thing.jsonld",
            "http://schema4i.org/Action.jsonld",
            "http://schema4i.org/SearchAction.jsonld",
          ],
          "@type": "SearchAction",
          Object: {
            "@context": [
              "http://schema4i.org/Thing.jsonld",
              "http://schema4i.org/Filter",
              "http://schema4i.org/DataLakeItem",
              "http://schema4i.org/UserAccount",
            ],
            "@type": "Filter",
            FilterItem: {
              "@type": "DataLakeItem",
              Creator: {
                "@type": "UserAccount",
                Identifier: localStorage.getItem("accountId"),
              },
              About: {
                "@type": "Transaction",
                accountNumber: accountNumber,
              },
            },
          },
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const transactions = data.Result.ItemListElement.map(
          (item) => item.Item.About
        );
        setTransactions(transactions);
        const newBalances = {
          checking: 0,
          savings: 0,
          creditCard: 0,
          investment: 0,
        };
        transactions.forEach((transaction) => {
          if (transaction.type === "deposit") {
            newBalances[transaction.accountType] += transaction.amount;
          } else if (transaction.type === "withdraw" || transaction.type === "etransfer") {
            newBalances[transaction.accountType] -= transaction.amount;
          }
        });
        setBalances(newBalances);
      } else {
        throw new Error("Failed to load transactions");
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const clearTransactions = async (accountNumber) => {
    try {
      const response = await fetch(apiConfig.url, {
        method: "POST",
        headers: apiConfig.headers,
        body: JSON.stringify({
          "@context": [
            "http://schema4i.org/Thing.jsonld",
            "http://schema4i.org/Action.jsonld",
            "http://schema4i.org/DeleteAction.jsonld",
          ],
          "@type": "DeleteAction",
          Object: {
            "@context": [
              "http://schema4i.org/Thing.jsonld",
              "http://schema4i.org/Filter",
              "http://schema4i.org/DataLakeItem",
              "http://schema4i.org/UserAccount",
            ],
            "@type": "Filter",
            FilterItem: {
              "@type": "DataLakeItem",
              Creator: {
                "@type": "UserAccount",
                Identifier: localStorage.getItem("accountId"),
              },
              About: {
                "@type": "Transaction",
                accountNumber: accountNumber,
              },
            },
          },
        }),
      });
      if (response.ok) {
        setTransactions([]);
        setBalances({ checking: 0, savings: 0, creditCard: 0, investment: 0 }); // Reset balances
      } else {
        throw new Error("Failed to clear transactions");
      }
    } catch (error) {
      console.error("Error clearing transactions:", error);
    }
  };

  const handleTransaction = ({ amount, type, accountType, contact }) => {
    const accountNumber = localStorage.getItem("accountNumber");
    const transaction = {
      type,
      accountNumber,
      amount,
      accountType,
      contact,
      timestamp: new Date().toLocaleString(),
    };

    let newBalance;
    if (type === "deposit") {
      newBalance = balances[accountType] + amount;
    } else if (type === "withdraw" || type === "etransfer") {
      if (balances[accountType] < amount) {
        alert("Insufficient balance");
        return;
      }
      newBalance = balances[accountType] - amount;
    }

    setBalances({
      ...balances,
      [accountType]: newBalance,
    });

    setTransactions((prevTransactions) => [...prevTransactions, transaction]);
    saveTransactionToAPI(transaction);
  };

  const ProtectedRoute = ({ element }) => {
    return isAuthenticated ? element : <Navigate to="/login" />;
  };

  const RouteChangeHandler = () => {
    const location = useLocation();

    useEffect(() => {
      localStorage.setItem("lastVisitedRoute", location.pathname);
    }, [location]);

    return null;
  };

  return (
    <Router>
      <div>
        <Navbar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
        <div className="container mt-4">
          <RouteChangeHandler />
          <Routes>
            <Route
              path="/"
              element={isAuthenticated ? <Navigate to="/home" /> : <Dashboard />}
            />
            <Route
              path="/login"
              element={<Login onLogin={handleLogin} isAuthenticated={isAuthenticated} />}
            />
            <Route path="/signup" element={<SignUp />} />
            {isAuthenticated && (
              <>
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute
                      element={
                        <HomePage
                          balances={balances}
                          transactions={transactions}
                          onLoadTransactions={loadTransactions}
                          onClearTransactions={clearTransactions}
                          firstName={localStorage.getItem("firstName")}
                          lastName={localStorage.getItem("lastName")}
                        />
                      }
                    />
                  }
                />
                <Route
                  path="/deposit"
                  element={
                    <ProtectedRoute
                      element={<TransactionForm type="deposit" onSubmit={handleTransaction} />}
                    />
                  }
                />
                <Route
                  path="/withdraw"
                  element={
                    <ProtectedRoute
                      element={<TransactionForm type="withdraw" onSubmit={handleTransaction} />}
                    />
                  }
                />
                <Route
                  path="/etransfer"
                  element={
                    <ProtectedRoute
                      element={<TransactionForm type="etransfer" onSubmit={handleTransaction} />}
                    />
                  }
                />
                <Route path="*" element={<Navigate to="/home" />} />
              </>
            )}
            {!isAuthenticated && (
              <Route path="*" element={<Navigate to="/" />} />
            )}
          </Routes>
        </div>
        <Footer />
      </div>
    </Router>
  );
};

export default App;