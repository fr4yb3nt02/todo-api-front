import "./App.css";
import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

const API_URL = "https://localhost:5000/api";

interface TodoItem {
  id: number;
  title: string;
  isCompleted: boolean;
}

interface TodoList {
  id: number;
  name: string;
}

function App() {
  const [todoItems, setTodoItems] = useState<TodoItem[]>([]);
  const [todoList, setTodoList] = useState<TodoList[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedTodoList, setSelectedTodoList] = useState(1);
  const [isCompleteItemsRunning, setIsCompleteItemsRunning] = useState(false);
  const [reloadItems, setReloadItems] = useState(0);

  //Effect para cargar las listas para el DDL
  useEffect(() => {
    fetch(`${API_URL}/todolists`)
      .then((response) => response.json())
      .then((data) => setTodoList(data));
  }, []);

  //Efecto actualiza los items cada vez que cambio la lista seleccionada o al cerrar el modal de completar
  useEffect(() => {
    fetch(`${API_URL}/todolists/${selectedTodoList}/todoitems`)
      .then((response) => response.json())
      .then((data) => setTodoItems(data))
      .catch((error) => console.error("Error al cargar los items:", error));
  }, [selectedTodoList, reloadItems]);

  const handleListChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTodoList(Number(event.target.value));
  };

  const handleCompleteAll = async () => {
    if (isCompleteItemsRunning) {
      setIsModalOpen(true);
      return;
    }

    setIsCompleteItemsRunning(true);
    setIsModalOpen(true);
    setProgress(0);

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("https://localhost:5000/progressHub")
      .withAutomaticReconnect()
      .build();

    try {
      await connection.start();
      console.log("Conexión con SignalR establecida");

      connection.on("UpdateProgress", (value) => {
        setProgress(value.progress);
      });

      await fetch(
        `${API_URL}/todolists/${selectedTodoList}/complete-all-items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Proceso inciiado");
    } catch (error) {
      console.error(
        "Error al conectar con SignalR o iniciar el proceso: ",
        error
      );
    } finally {
      connection.onclose(() => {
        console.log("Conexión con SignalR cerrada.");
        setIsCompleteItemsRunning(false);
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setReloadItems((prev) => prev + 1);
  };

  return (
    <div className="page">
      <header>
        <h1>Prueba técnica - Crunchloop</h1>
        <div className="dropdown">
          <label htmlFor="todoListSelect">Seleccionar Todo List:</label>
          <select
            id="todoListSelect"
            value={selectedTodoList}
            onChange={handleListChange}
          >
            {todoList.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main>
        <button className="btn" onClick={handleCompleteAll}>
          Completar todos los items
        </button>

        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {todoItems.map((todo) => (
              <tr key={todo.id}>
                <td>{todo.title}</td>
                <td>{todo.isCompleted ? "✔️" : "❌"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>

      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h2>Completando items...</h2>
            <p>Completado: {progress}%</p>
            <button onClick={handleCloseModal}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
