import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GoogleFitConnect from "./GoogleFitConnect";
import GoogleFitDashboard from "./GoogleFitDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GoogleFitConnect />} />
        <Route path="/google-fit-dashboard" element={<GoogleFitDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
