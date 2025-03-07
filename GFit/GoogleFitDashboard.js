import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const GoogleFitDashboard = () => {
    const [healthData, setHealthData] = useState(null);
    const [analysis, setAnalysis] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetch("https://googlefitapi-skimgworld.onrender.com/get_health_data", {
            credentials: "include"  // Ensure cookies/session are included
        })
            .then(response => {
                if (response.status === 401) {
                    navigate("/"); // Redirect to login if unauthorized
                    return null;
                }
                return response.json();
            })
            .then(data => {
                if (data) {
                    setHealthData(data.health_data);
                    setAnalysis(cleanAnalysisText(data.analysis));
                }
            })
            .catch(error => console.error("Error fetching data:", error));
    }, [navigate]);

    // Function to clean AI response
    const cleanAnalysisText = (text) => {
        return text.replace(/\\/g, "").replace(/\*/g, "").replace(/\n{2,}/g, "\n").trim();
    };

    if (!healthData) return <p>Loading Google Fit data...</p>;

    const chartData = Object.keys(healthData).map(date => ({
        date,
        steps: healthData[date].steps,
        calories: healthData[date].calories_burned,
        distance: healthData[date].distance
    }));

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-center text-blue-600">Google Fit Dashboard</h1>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 shadow-lg rounded-lg">
                    <thead>
                        <tr className="bg-blue-500 text-white">
                            <th className="border p-2">Date</th>
                            <th className="border p-2">Steps</th>
                            <th className="border p-2">Calories Burned</th>
                            <th className="border p-2">Distance (m)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(healthData).map(date => (
                            <tr key={date} className="text-center hover:bg-gray-100">
                                <td className="border p-2">{date}</td>
                                <td className="border p-2">{healthData[date].steps}</td>
                                <td className="border p-2">{healthData[date].calories_burned.toFixed(2)}</td>
                                <td className="border p-2">{healthData[date].distance.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h2 className="text-xl font-semibold mt-6 text-center text-gray-700">Health Trends</h2>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="steps" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="calories" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>

            <h2 className="text-xl font-semibold mt-6 text-center text-gray-700">AI Health Insights</h2>
            <div className="bg-gray-100 p-4 rounded shadow-md mt-4 text-gray-800 whitespace-pre-line">
                {analysis}
            </div>
        </div>
    );
};

export default GoogleFitDashboard;
