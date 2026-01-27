"use client";
import React, { useState } from "react";
import { toast } from "react-toastify";

const LinksPage = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!text.trim()) {
      toast.error("Please enter some text", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Link saved successfully!", {
          position: "top-right",
          autoClose: 2000,
        });
        setText(""); // Clear input after successful save
      } else {
        // Show error message from API (includes the date if duplicate)
        toast.error(data.error || "Failed to save link", {
          position: "top-right",
          autoClose: 4000,
        });
      }
    } catch {
      toast.error("Network error. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6 text-center">Link Listing</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="link-text" className="block text-gray-700 mb-2">
              Enter Link
            </label>
            <input
              type="text"
              id="link-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your link here..."
              className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LinksPage;

