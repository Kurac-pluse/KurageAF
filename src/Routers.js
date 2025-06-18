import { Routes, Route } from "react-router-dom";
import Master from "./pages/master"
import Player1 from "./pages/player1";
import Player2 from "./pages/player2";

export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Master />} />
            <Route path="/player1" element={<Player1 />} />
            <Route path="/player2" element={<Player2 />} />
        </Routes>
    )
}
