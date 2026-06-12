"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { BsSend } from "react-icons/bs";
import { FaRegCopy } from "react-icons/fa6";
import { WiCloudRefresh } from "react-icons/wi";
import { ProfileModel } from "@/types";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/AuthContext";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("Link copied to clipboard");
};

const getTechnicalBadge = (profile: ProfileModel) => {
  const summary = (profile.sumary || "").toLowerCase();
  if (!summary) return null;
  if (/\bnon[- ]?technical\b/.test(summary)) return "N";
  if (/\btechnical\b/.test(summary)) return "T";
  return null;
};

const getTechnicalBadgeColor = (profile: ProfileModel) => {
  const summary = (profile.sumary || "").toLowerCase();
  if (!summary) return "";
  if (/\bnon[- ]?technical\b/.test(summary)) return "bg-orange-500"; // Orange for non-technical
  if (/\btechnical\b/.test(summary)) return "bg-blue-500"; // Blue for technical
  return "";
};

const getAvatarBorderColor = (profile: ProfileModel) => {
  const summary = (profile.sumary || "").toLowerCase();
  if (!summary) return "border-gray-300"; // Default border
  if (/\bnon[- ]?technical\b/.test(summary)) return "border-orange-500"; // Orange border for non-technical
  if (/\btechnical\b/.test(summary)) return "border-blue-500"; // Blue border for technical
  return "border-gray-300"; // Default border
};

const ProfileOverview = ({
  profile,
  show,
  panelSide = "right",
  handleClose,
  handleUpdate,
  onStatusUpdate,
}: {
  profile: ProfileModel | null;
  show: boolean;
  /** Which half of the screen shows the detail: "right" (default) or "left" */
  panelSide?: "left" | "right";
  handleClose: () => void;
  handleUpdate: (profile: ProfileModel) => void;
  onStatusUpdate?: (profileId: string, status: boolean | null, viewers?: Record<string, boolean>) => void;
}) => {
  const { token, user } = useAuth();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const wasVisitedRef = useRef(false);
  const initialStatusRef = useRef<string | null | undefined>(undefined);

  const handleStatusChange = useCallback(async (status: string | boolean | null) => {
    if (!profile || !token || !onStatusUpdate) return;
    
    setUpdatingStatus(true);
    
    try {
      const response = await fetch("/api/profiles/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          profileId: profile.userId,
          status,
        }),
      });

      if (response.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("daily-mark-stats-refresh"));
        }
        const responseData = await response.json();
        // Convert status for backward compatibility
        let statusForUpdate: boolean | null = null;
        if (status === "good" || status === true) statusForUpdate = true;
        else if (status === "bad" || status === false) statusForUpdate = false;
        else if (status === "visited") statusForUpdate = null; // "visited" is a string status
        else statusForUpdate = null;
        
        onStatusUpdate(profile.userId, statusForUpdate, responseData.viewers);
        
        // Update local profile state
        const updatedProfile = { ...profile };
        if (!updatedProfile.viewers) {
          updatedProfile.viewers = {};
        }
        if (status === null || status === "yet") {
          delete updatedProfile.viewers[user?.id || ""];
        } else {
          // Store as string for new format
          const statusValue = typeof status === "string" ? status : (status === true ? "good" : "bad");
          updatedProfile.viewers[user?.id || ""] = statusValue;
        }
        handleUpdate(updatedProfile);
        
        const statusText = status === true || status === "good" ? "Good" 
          : status === false || status === "bad" ? "Bad"
          : status === "visited" ? "Visited"
          : status === "sent" ? "Sent"
          : "Yet";
        toast.success(`Profile status updated to "${statusText}"`, {
          position: "top-right",
          autoClose: 2000,
        });
      } else {
        const errorData = await response.json();
        toast.error(`Failed to update status: ${errorData.error || "Unknown error"}`, {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Network error. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setUpdatingStatus(false);
    }
  }, [profile, token, onStatusUpdate, user, handleUpdate]);

  // Track when overview is opened and current status
  useEffect(() => {
    if (show && profile && user) {
      wasVisitedRef.current = true;
      // Store initial status
      const userStatus = profile.viewers?.[user.id];
      // Convert boolean to string for compatibility
      if (userStatus === true) {
        initialStatusRef.current = "good";
      } else if (userStatus === false) {
        initialStatusRef.current = "bad";
      } else {
        initialStatusRef.current = null;
      }
    }
  }, [show, profile, user]);

  // When closing, update status to "visited" if it was "Yet"
  useEffect(() => {
    if (!show && wasVisitedRef.current && profile && user && onStatusUpdate && token) {
      const currentStatus = profile.viewers?.[user.id];
      // Convert to string format
      let statusStr: string | null = null;
      if (currentStatus === true) {
        statusStr = "good";
      } else if (currentStatus === false) {
        statusStr = "bad";
      } else if (typeof currentStatus === "string") {
        statusStr = currentStatus;
      }
      
      // If status is still "Yet" (null/undefined/"yet"), mark as visited
      if (!statusStr || statusStr === "yet") {
        handleStatusChange("visited");
      }
      wasVisitedRef.current = false;
    }
  }, [show, profile, user, onStatusUpdate, token, handleStatusChange]);

  const updateProfile = async (url: string) => {
    const response = await fetch("/api/scrape-one", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) toast.error("Failed to fetch profile");
    else {
      const data = await response.json();
      handleUpdate(data.profile);
      toast.success("Profile fetched successfully");
    }
  };

  const getStatusColor = (profile: ProfileModel) => {
    if (!profile.viewers || !user) return "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
    
    const userStatus = profile.viewers[user.id];
    // Handle both old format (boolean) and new format (string)
    if (userStatus === true || userStatus === "good") return "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200";
    if (userStatus === false || userStatus === "bad") return "bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200";
    if (userStatus === "visited") return "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200";
    if (userStatus === "sent") return "bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200";
    return "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
  };

  const getStatusText = (profile: ProfileModel) => {
    if (!profile.viewers || !user) return "Yet";
    
    const userStatus = profile.viewers[user.id];
    // Handle both old format (boolean) and new format (string)
    if (userStatus === true || userStatus === "good") return "Good";
    if (userStatus === false || userStatus === "bad") return "Bad";
    if (userStatus === "visited") return "Visited";
    if (userStatus === "sent") return "Sent";
    return "Yet";
  };

  const StatusDropdown = () => {
    if (!profile) return null;
    
    return (
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
        <select
          value={getStatusText(profile)}
          onChange={(e) => {
            const value = e.target.value;
            let status: string | null = null;
            if (value === "Good") status = "good";
            else if (value === "Bad") status = "bad";
            else if (value === "Visited") status = "visited";
            else if (value === "Sent") status = "sent";
            else status = null;
            handleStatusChange(status);
          }}
          disabled={updatingStatus}
          className={`px-3 py-2 rounded text-sm font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${getStatusColor(profile)} ${
            updatingStatus ? "opacity-50" : ""
          }`}
          style={{
            colorScheme: 'auto'
          }}
        >
          <option value="Yet" className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">Yet</option>
          <option value="Visited" className="bg-white dark:bg-gray-800 text-blue-800 dark:text-blue-200">Visited</option>
          <option value="Sent" className="bg-white dark:bg-gray-800 text-purple-800 dark:text-purple-200">Sent</option>
          <option value="Good" className="bg-white dark:bg-gray-800 text-green-800 dark:text-green-200">Good</option>
          <option value="Bad" className="bg-white dark:bg-gray-800 text-red-800 dark:text-red-200">Bad</option>
        </select>
      </div>
    );
  };

  const backdrop = (
    <div className="w-1/2" onClick={handleClose} aria-hidden />
  );
  const panelShell = profile ? (
    <div
      className={`bg-white dark:bg-gray-900 shadow-lg p-6 ${
        panelSide === "right" ? "rounded-l-lg" : "rounded-r-lg"
      }`}
    >
            {/* Status dropdown at top */}
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <StatusDropdown />
            </div>

            <div className="flex items-center gap-6 mb-6">
              {profile.avatar && (
                <div className="relative">
                  <Image
                    src={profile.avatar.startsWith("http")
                      ? profile.avatar
                      : `https:${profile.avatar}`}
                    alt={profile.name}
                    width={160}
                    height={160}
                    className={`rounded-full border-4 ${getAvatarBorderColor(profile)}`}
                  />
                  {getTechnicalBadge(profile) && (
                    <div className={`absolute bottom-0 right-0 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold border-2 border-white ${getTechnicalBadgeColor(profile)}`}>
                      {getTechnicalBadge(profile)}
                    </div>
                  )}
                </div>
              )}
              <div>
                <div className="flex flex-row gap-4">
                  <h1 className="text-2xl font-bold">{profile.name}</h1>
                  <button
                    className="p-1.5 text-xs rounded-md border text-white dark:text-gray-900 bg-blue-400 hover:bg-blue-500"
                    onClick={() => copyToClipboard(SITE_URL + profile.userId)}
                  >
                    <FaRegCopy className="w-4 h-4" />
                  </button>
                  <button
                    className="p-0.5 text-xs rounded-md border text-white dark:text-gray-900 bg-blue-400 hover:bg-blue-500"
                    onClick={() => updateProfile(SITE_URL + profile.userId)}
                  >
                    <WiCloudRefresh className="w-6 h-6" />
                  </button>
                  <Link
                    target="_blank"
                    href={SITE_URL + profile.userId}
                    className="p-1.5 text-xs rounded-md border text-white dark:text-gray-900 bg-green-400 hover:bg-green-500"
                  >
                    <BsSend className="w-4 h-4" />
                  </Link>
                </div>
                <p>{profile.location}</p>
                <p>{profile?.age} years old</p>
                <p>Last seen {profile.lastSeen}</p>
                <div className="flex items-center gap-2">
                  <span>LinkedIn: {profile?.linkedIn}</span>
                  {profile?.linkedIn && (
                    <button
                      className="p-1 text-xs rounded-md border text-white dark:text-gray-900 bg-blue-400 hover:bg-blue-500"
                      onClick={() => copyToClipboard(profile.linkedIn!)}
                      title="Copy LinkedIn URL"
                    >
                      <FaRegCopy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {/* <section>
                <p>{profile.sumary}</p>
              </section> */}

              <section>
                {/* <h2 className="text-xl font-semibold mb-4">About Me</h2>
                <h3 className="font-semibold my-1">Intro</h3>
                <p>{profile.intro}</p>
                <h3 className="font-semibold my-1">Life Story</h3>
                <p>{profile.lifeStory}</p>
                <h3 className="font-semibold my-1">Free Time</h3>
                <p>{profile.freeTime}</p> */}
                <h3 className="font-semibold my-1">Other</h3>
                <p>{profile.other}</p>
              </section>

              {/* <section>
                <h2 className="text-xl font-semibold mb-4">My Background</h2>
                <h3 className="font-semibold my-1">
                  Impressive accomplishment
                </h3>
                <p>{profile.accomplishments}</p>
                <h3 className="font-semibold my-1">Education</h3>
                <ul className="list-disc pl-5">
                  {profile.education?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <h3 className="font-semibold my-1">Employment</h3>
                <ul className="list-disc pl-5">
                  {profile.employment?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section> */}

              <section>
                <h2 className="text-xl font-semibold mb-4">
                  {profile.startup?.name}
                </h2>
                <h3 className="font-semibold my-1">{profile.startup?.name}</h3>
                <p>{profile.startup?.description}</p>
                <h3 className="font-semibold my-1">Progress</h3>
                <p>{profile.startup?.progress}</p>
                <h3 className="font-semibold my-1">Funding Status</h3>
                <p>{profile.startup?.funding}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">
                  Co-founder Preferences
                </h2>
                <ul className="list-disc pl-5">
                  {profile.cofounderPreferences?.requirements?.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
                <h3 className="font-semibold my-1">Ideal co-founder</h3>
                <p>{profile.cofounderPreferences?.idealPersonality}</p>
                <h3 className="font-semibold my-1">Equity expectations</h3>
                <p>{profile.cofounderPreferences?.equity}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold mb-4">Interests</h2>
                <div className="flex flex-row gap-4">
                  <div>
                    <p>{profile.interests?.shared?.join(", ")}</p>
                  </div>
                  <div>
                    
                    <p>{profile.interests?.personal?.join(", ")}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Status dropdown at bottom */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <StatusDropdown />
            </div>
          </div>
  ) : null;

  const panelWrap = (
    <div className="w-1/2 overflow-auto min-h-0">{panelShell}</div>
  );

  return (
    <div
      className={`absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 overflow-auto flex flex-row z-50 ${
        show ? "" : "hidden"
      }`}
    >
      {panelSide === "right" ? (
        <>
          {backdrop}
          {panelWrap}
        </>
      ) : (
        <>
          {panelWrap}
          {backdrop}
        </>
      )}
    </div>
  );
};

export default ProfileOverview;
