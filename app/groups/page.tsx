"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Group = {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      username: string;
    };
  }>;
};

type Friend = {
  id: string;
  username: string;
  avatar: string | null;
  friendshipId: string;
};

type PendingRequest = {
  id: string;
  friendshipId: string;
  username: string;
  avatar: string | null;
};

export default function GroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"groups" | "friends">("groups");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  // Friends state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingReceived, setPendingReceived] = useState<PendingRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<PendingRequest[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchGroups();
      fetchFriends();
      checkPendingGroupCode();
    }
  }, [status, router]);

  const checkPendingGroupCode = async () => {
    const pendingCode = localStorage.getItem("pendingGroupCode");
    if (pendingCode) {
      localStorage.removeItem("pendingGroupCode");
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: pendingCode.toUpperCase() }),
        });
        if (res.ok) {
          const group = await res.json();
          setGroups((prev) => [...prev, group]);
          alert(`Te uniste al grupo "${group.name}"`);
        }
      } catch (error) {
        console.error("Error joining group:", error);
      }
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      setGroups(data);
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFriends = async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      setFriends(data.friends || []);
      setPendingReceived(data.pendingReceived || []);
      setPendingSent(data.pendingSent || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() }),
      });
      if (res.ok) {
        const newGroup = await res.json();
        setGroups([...groups, newGroup]);
        setShowCreateModal(false);
        setGroupName("");
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!inviteCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase() }),
      });
      if (res.ok) {
        const group = await res.json();
        setGroups([...groups, group]);
        setShowJoinModal(false);
        setInviteCode("");
      } else {
        const error = await res.json();
        alert(error.error || "Error al unirse al grupo");
      }
    } catch (error) {
      console.error("Error joining group:", error);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!confirm("Seguro que queres salir de este grupo?")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
      if (res.ok) {
        setGroups(groups.filter((g) => g.id !== groupId));
      } else {
        const data = await res.json();
        alert(data.error || "Error al salir del grupo");
      }
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Seguro que queres eliminar este grupo? Se eliminara para todos los miembros.")) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
      if (res.ok) {
        setGroups(groups.filter((g) => g.id !== groupId));
      } else {
        const data = await res.json();
        alert(data.error || "Error al eliminar grupo");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
    }
  };

  const handleRemoveMember = async (groupId: string, memberId: string, username: string) => {
    if (!confirm(`Seguro que queres sacar a @${username} del grupo?`)) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberId}`, { method: "DELETE" });
      if (res.ok) {
        setGroups(groups.map((g) => {
          if (g.id === groupId) {
            return { ...g, members: g.members.filter((m) => m.id !== memberId) };
          }
          return g;
        }));
      } else {
        const data = await res.json();
        alert(data.error || "Error al sacar miembro");
      }
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const shareWhatsApp = (group: Group) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/join/${group.inviteCode}`;
    const message = `Unite al grupo "${group.name}" para Cosquin Rock 2026!\n\n${inviteUrl}\n\nO usa el codigo: ${group.inviteCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Codigo copiado: ${code}`);
  };

  const copyGroupLink = (group: Group) => {
    const baseUrl = window.location.origin;
    const inviteUrl = `${baseUrl}/join/${group.inviteCode}`;
    navigator.clipboard.writeText(inviteUrl);
    alert(`Link copiado al portapapeles!`);
  };

  const isAdmin = (group: Group) => group.createdBy === session?.user?.id;

  // Friends handlers
  const handleAddFriend = async () => {
    if (!friendUsername.trim()) return;
    setAddingFriend(true);
    setFriendError("");
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: friendUsername.trim().toLowerCase() }),
      });
      if (res.ok) {
        setShowAddFriendModal(false);
        setFriendUsername("");
        fetchFriends();
      } else {
        const data = await res.json();
        setFriendError(data.error || "Error al enviar solicitud");
      }
    } catch (error) {
      setFriendError("Error de conexion");
    } finally {
      setAddingFriend(false);
    }
  };

  const handleAcceptFriend = async (friendshipId: string) => {
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "PUT" });
      if (res.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error("Error accepting friend:", error);
    }
  };

  const handleRejectFriend = async (friendshipId: string) => {
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (res.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error("Error rejecting friend:", error);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, username: string) => {
    if (!confirm(`Seguro que queres eliminar a @${username} de tus amigos?`)) return;
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" });
      if (res.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 flex-shrink-0 z-10">
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-xl font-bold text-white mb-3">Social</h1>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl">
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === "groups"
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Grupos
              {groups.length > 0 && (
                <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{groups.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all duration-200 relative ${
                activeTab === "friends"
                  ? "bg-gradient-to-r from-primary to-primary-dark text-white shadow-lg shadow-primary/20"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Amigos
              {friends.length > 0 && (
                <span className="ml-1.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">{friends.length}</span>
              )}
              {pendingReceived.length > 0 && activeTab !== "friends" && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                  {pendingReceived.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto min-h-0 pb-16">
        {activeTab === "groups" ? (
          /* ===== GROUPS TAB ===== */
          <div className="p-4">
            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="py-3 px-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-medium shadow-lg shadow-primary/20"
              >
                + Crear Grupo
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowJoinModal(true)}
                className="py-3 px-4 bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl font-medium hover:bg-zinc-700 transition-colors"
              >
                Unirse con codigo
              </motion.button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl p-4 animate-pulse">
                    <div className="h-5 bg-zinc-800 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-zinc-800 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-zinc-400 mb-2">No estas en ningun grupo</p>
                <p className="text-sm text-zinc-600">Crea un grupo o unite con un codigo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
                  >
                    {/* Group header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">{group.name}</h3>
                          {isAdmin(group) && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full font-medium">Admin</span>
                          )}
                        </div>
                        <button
                          onClick={() => copyInviteCode(group.inviteCode)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-mono transition-colors text-xs"
                        >
                          {group.inviteCode}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3">
                        <span>{group.members.length} miembros</span>
                      </div>

                      {/* Quick member chips */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {group.members.slice(0, 5).map((member) => (
                          <div key={member.id} className="px-2 py-1 bg-primary/15 text-primary rounded-lg text-xs font-medium">
                            @{member.user.username}
                          </div>
                        ))}
                        {group.members.length > 5 && (
                          <div className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-xs">
                            +{group.members.length - 5} mas
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => shareWhatsApp(group)}
                          className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </button>

                        <button
                          onClick={() => copyGroupLink(group)}
                          className="py-2 px-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Manage button */}
                        <button
                          onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
                          className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors text-sm"
                        >
                          <svg className={`w-4 h-4 transition-transform ${expandedGroup === group.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Expanded management section */}
                    <AnimatePresence>
                      {expandedGroup === group.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-zinc-800 p-4">
                            <h4 className="text-sm font-semibold text-zinc-300 mb-3">Miembros</h4>
                            <div className="space-y-2 mb-4">
                              {group.members.map((member) => (
                                <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-zinc-800/50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-white">@{member.user.username}</span>
                                    {member.userId === group.createdBy && (
                                      <span className="text-[9px] px-1.5 py-0.5 bg-primary/20 text-primary rounded-full">admin</span>
                                    )}
                                  </div>
                                  {isAdmin(group) && member.userId !== session?.user?.id && (
                                    <button
                                      onClick={() => handleRemoveMember(group.id, member.id, member.user.username)}
                                      className="text-zinc-500 hover:text-red-400 transition-colors p-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Leave/Delete buttons */}
                            <div className="flex gap-2">
                              {!isAdmin(group) && (
                                <button
                                  onClick={() => handleLeaveGroup(group.id)}
                                  className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors border border-zinc-700"
                                >
                                  Salir del grupo
                                </button>
                              )}
                              {isAdmin(group) && (
                                <button
                                  onClick={() => handleDeleteGroup(group.id)}
                                  className="flex-1 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
                                >
                                  Eliminar grupo
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ===== FRIENDS TAB ===== */
          <div className="p-4">
            {/* Add friend button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setShowAddFriendModal(true); setFriendError(""); setFriendUsername(""); }}
              className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-medium shadow-lg shadow-primary/20 mb-6"
            >
              + Agregar amigo
            </motion.button>

            {friendsLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-zinc-900 rounded-xl p-4 animate-pulse">
                    <div className="h-5 bg-zinc-800 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-zinc-800 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Pending received */}
                {pendingReceived.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-3">Solicitudes pendientes</h3>
                    <div className="space-y-2">
                      {pendingReceived.map((req) => (
                        <motion.div
                          key={req.friendshipId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center justify-between py-3 px-4 bg-zinc-900 rounded-xl border border-primary/20"
                        >
                          <span className="text-sm text-white font-medium">@{req.username}</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptFriend(req.friendshipId)}
                              className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-xs font-semibold transition-colors"
                            >
                              Aceptar
                            </button>
                            <button
                              onClick={() => handleRejectFriend(req.friendshipId)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg text-xs font-medium transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending sent */}
                {pendingSent.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-3">Enviadas</h3>
                    <div className="space-y-2">
                      {pendingSent.map((req) => (
                        <div
                          key={req.friendshipId}
                          className="flex items-center justify-between py-3 px-4 bg-zinc-900 rounded-xl border border-zinc-800"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">@{req.username}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-full">Pendiente</span>
                          </div>
                          <button
                            onClick={() => handleRejectFriend(req.friendshipId)}
                            className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Friends list */}
                {friends.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🤝</div>
                    <p className="text-zinc-400 mb-2">No tenes amigos agregados</p>
                    <p className="text-sm text-zinc-600">Agrega amigos por su username para ver sus bandas</p>
                  </div>
                ) : friends.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-300 mb-3">Amigos ({friends.length})</h3>
                    <div className="space-y-2">
                      {friends.map((friend, index) => (
                        <motion.div
                          key={friend.friendshipId}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between py-3 px-4 bg-zinc-900 rounded-xl border border-zinc-800"
                        >
                          <span className="text-sm text-white font-medium">@{friend.username}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/compare/${friend.id}`)}
                              className="text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg transition-colors font-medium"
                            >
                              Comparar
                            </button>
                            <button
                              onClick={() => handleRemoveFriend(friend.friendshipId, friend.username)}
                              className="text-zinc-600 hover:text-red-400 transition-colors p-1"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Crear Grupo</h2>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej: Amigos del Cole"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 px-4 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleCreateGroup} disabled={creating || !groupName.trim()} className="flex-1 py-2.5 px-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold disabled:opacity-50 transition-opacity">
                {creating ? "Creando..." : "Crear"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Unirse con Codigo</h2>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="Codigo (ej: ABC123)"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary mb-4 font-mono uppercase"
              autoFocus
              maxLength={6}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowJoinModal(false)} className="flex-1 py-2.5 px-4 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleJoinGroup} disabled={joining || !inviteCode.trim()} className="flex-1 py-2.5 px-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold disabled:opacity-50 transition-opacity">
                {joining ? "Uniendose..." : "Unirse"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-zinc-900 border border-zinc-700 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Agregar amigo</h2>
            <input
              type="text"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              placeholder="Username (ej: juani)"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary mb-2"
              autoFocus
              autoComplete="off"
            />
            {friendError && (
              <p className="text-red-400 text-sm mb-3">{friendError}</p>
            )}
            <p className="text-zinc-500 text-xs mb-4">Ingresa el username de tu amigo</p>
            <div className="flex gap-3">
              <button onClick={() => setShowAddFriendModal(false)} className="flex-1 py-2.5 px-4 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleAddFriend} disabled={addingFriend || !friendUsername.trim()} className="flex-1 py-2.5 px-4 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl font-semibold disabled:opacity-50 transition-opacity">
                {addingFriend ? "Enviando..." : "Enviar solicitud"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 px-4 py-3 pb-safe z-20" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <button onClick={() => router.push("/schedule")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span className="text-[10px]">Grilla</span>
          </button>
          <button onClick={() => router.push("/my-bands")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span className="text-[10px]">Mi Agenda</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-primary relative">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="text-[10px] font-semibold">Social</span>
            {pendingReceived.length > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {pendingReceived.length}
              </span>
            )}
          </button>
          <button onClick={() => router.push("/profile")} className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px]">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
