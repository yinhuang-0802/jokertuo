import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Lobby from "@/pages/Lobby";
import Room from "@/pages/Room";
import Game from "@/pages/Game";
import Result from "@/pages/Result";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/room/:roomId" element={<Room />} />
        <Route path="/game" element={<Game />} />
        <Route path="/game/:roomId" element={<Game />} />
        <Route path="/result" element={<Result />} />
        <Route path="/result/:roomId" element={<Result />} />
      </Routes>
    </Router>
  );
}
