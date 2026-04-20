'use client'
import Image from "next/image";
import { ProfileModel } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "react-toastify";
import { FaRegCopy } from "react-icons/fa6";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

const copyToClipboard = (text: string, e?: React.MouseEvent) => {
  e?.stopPropagation();
  navigator.clipboard.writeText(text);
  toast.success("Link copied to clipboard");
};

const ProfileTable = ({
  loading,
  profiles,
  handleOverview,
  onStatusUpdate,
}: {
  loading: boolean;
  profiles: ProfileModel[];
  /** 0 = left list column → detail opens on the right; 1 = right list column → detail opens on the left */
  handleOverview: (profile: ProfileModel, sourceColumn: 0 | 1) => void;
  onStatusUpdate: (profileId: string, status: boolean | null, viewers?: Record<string, boolean>) => void;
}) => {
  const { token, user } = useAuth();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const handleStatusChange = async (profileId: string, status: boolean | string | null, e?: React.MouseEvent | React.ChangeEvent) => {
    e?.stopPropagation(); // Prevent row click
    setUpdatingStatus(profileId);
    
    try {
      const response = await fetch("/api/profiles/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          profileId,
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
        else statusForUpdate = null;
        
        onStatusUpdate(profileId, statusForUpdate, responseData.viewers);
        
        // Show success toast
        const statusText = status === true || status === "good" ? "Good" 
          : status === false || status === "bad" ? "Bad"
          : status === "visited" ? "Visited"
          : status === "sent" ? "Sent"
          : "Yet";
        toast.success(`Profile status updated to "${statusText}"`, {
          position: "top-right",
          autoClose: 2000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        const errorData = await response.json();
        console.error("Failed to update status:", errorData.error || "Unknown error");
        
        // Show error toast
        toast.error(`Failed to update status: ${errorData.error || "Unknown error"}`, {
          position: "top-right",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } 
    } catch (error) {
      console.error("Error updating status:", error);
      
      // Show error toast for network errors
      toast.error("Network error. Please try again.", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } finally {
      setUpdatingStatus(null);
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

  const isYetStatus = (profile: ProfileModel) => {
    return getStatusText(profile) === "Yet";
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
  
  const formatUpdatedAtUTC = (value: unknown) => {
    try {
      const d = new Date(value as string);
      if (isNaN(d.getTime())) return "N/A";
      const formatted = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "UTC",
      }).format(d);
      return formatted;
    } catch {
      return "N/A";
    }
  };

  const getRowKey = (profile: ProfileModel, index: number) =>
    profile._id || `${profile.userId || "profile"}-${index}`;

  const mid = Math.ceil(profiles.length / 2);
  const profileColumns: ProfileModel[][] = loading
    ? [[], []]
    : [profiles.slice(0, mid), profiles.slice(mid)];

  const thead = (
    <thead className="text-sm text-left bg-gray-50 dark:bg-gray-800 top-0 z-10">
      <tr className="text-gray-600 dark:text-gray-400 uppercase">
        <th className="p-2">Table</th>
        <th className="p-2">Name</th>
        <th className="p-2">Location</th>
        <th className="p-2">Last Seen</th>
        <th className="p-2">Updated Date</th>
        <th className="p-2">Status</th>
      </tr>
    </thead>
  );

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          {[0, 1].map((colIndex) => (
            <table
              key={colIndex}
              className="min-w-0 w-full divide-y divide-gray-200 relative rounded-xl"
            >
              {thead}
              <tbody className="divide-y divide-gray-200">
                {loading
                  ? Array(6)
                      .fill(null)
                      .map((_, index) => (
                        <tr key={`loading-${colIndex}-${index}`}>
                          <td colSpan={6} className="text-center p-4">
                            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 rounded"></div>
                          </td>
                        </tr>
                      ))
                  : profileColumns[colIndex].map((profile, index) => {
                      const isYet = isYetStatus(profile);
                      const rowIndex = colIndex === 0 ? index : mid + index;
                      return (
                        <tr
                          key={getRowKey(profile, rowIndex)}
                          className={`${!isYet ? "bg-gray-100 dark:bg-gray-800" : ""} hover:bg-gray-300 dark:hover:bg-gray-600 hover:cursor-pointer`}
                          onClick={() => handleOverview(profile, colIndex as 0 | 1)}
                        >
                          <td className="p-2 w-[112px] align-top">
                            <div className="relative inline-block">
                              <Image
                                src={profile.avatar ? (profile.avatar.startsWith("http") ? profile.avatar : ("https:" + profile.avatar)) : "/cutestar.png"}
                                alt="Profile"
                                width={96}
                                height={96}
                                className={`rounded-full border-4 ${getAvatarBorderColor(profile)}`}
                              />
                              {getTechnicalBadge(profile) && (
                                <div className={`absolute right-0 bottom-2 w-6 h-6 text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ${getTechnicalBadgeColor(profile)}`}>
                                  {getTechnicalBadge(profile)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4 align-top break-words">
                            {profile.name || "N/A"}
                          </td>
                          <td className="p-4 align-top break-words">
                            {profile.location || "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap align-top">
                            {profile.lastSeen ? profile.lastSeen : "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap align-top">
                            {profile.updatedAt ? formatUpdatedAtUTC(profile.updatedAt) : "N/A"}
                          </td>
                          <td className="p-2 align-top">
                            <div className="relative flex flex-wrap items-center gap-2">
                              <button
                                className="p-1.5 text-xs rounded-md hover:text-blue-500 dark:text-gray-500 text-white"
                                onClick={(e) => copyToClipboard(String(SITE_URL) + profile.userId, e)}
                                title="Copy profile link"
                              >
                                <FaRegCopy className="w-4 h-4" />
                              </button>
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
                                  handleStatusChange(profile.userId, status, e);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={updatingStatus === profile.userId}
                                className={`max-w-full px-2 py-2 rounded text-sm font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 ${getStatusColor(profile)} ${
                                  updatingStatus === profile.userId ? "opacity-50" : ""
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
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileTable;
