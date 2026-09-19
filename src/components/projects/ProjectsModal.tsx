import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  X,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  FileText,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { ProjectItem, UserProfile, Conversation, FileItem } from "../../types";
import { chatStorage } from "../../services/storage";

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeProjectId,
  onSelectProject,
}) => {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);

  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInstructions, setEditInstructions] = useState("");

  useEffect(() => {
    if (isOpen) {
      setProjects(chatStorage.getProjects(currentUser?.id));
      setConversations(chatStorage.getConversations(currentUser?.id));
      setFiles(chatStorage.getFiles(currentUser?.id));
      setIsCreating(false);
      setEditingId(null);
    }
  }, [isOpen, currentUser]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newProject: ProjectItem = {
      id: "proj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      userId: currentUser?.id || "local_user",
      title: title.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      fileIds: [],
      conversationIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    chatStorage.saveProject(newProject);
    setProjects((prev) => [newProject, ...prev]);
    onSelectProject(newProject.id);

    setTitle("");
    setDescription("");
    setInstructions("");
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    chatStorage.deleteProject(id, currentUser?.id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      onSelectProject(null);
    }
  };

  const handleStartEdit = (p: ProjectItem) => {
    setEditingId(p.id);
    setEditTitle(p.title);
    setEditDescription(p.description || "");
    setEditInstructions(p.instructions || "");
  };

  const handleSaveEdit = (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (!target || !editTitle.trim()) return;

    const updated: ProjectItem = {
      ...target,
      title: editTitle.trim(),
      description: editDescription.trim(),
      instructions: editInstructions.trim(),
      updatedAt: Date.now(),
    };

    chatStorage.saveProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-[#141418] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">MEYRA Projects</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                  {currentUser ? "Personal Account" : "Local Workspace"}
                </span>
              </div>
              <p className="text-xs text-slate-400">Containers for custom instructions, chats & files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              {activeProjectId ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active Project: {projects.find((p) => p.id === activeProjectId)?.title || "Selected"}
                </span>
              ) : (
                <span>No active project (General Mode)</span>
              )}
            </div>
            {activeProjectId && (
              <button
                type="button"
                onClick={() => onSelectProject(null)}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Clear Active Project
              </button>
            )}
          </div>

          {/* Empty State when user has no projects and is not in creation mode */}
          {projects.length === 0 && !isCreating && (
            <div className="py-12 px-6 text-center rounded-2xl bg-neutral-900/40 border border-white/5 space-y-4 animate-fade-in my-2">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
                <FolderKanban className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-sm mx-auto">
                <h4 className="text-sm font-semibold text-white tracking-tight">Create your first project</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Projects isolate custom instructions, documents, and chat threads into focused workspaces for your work.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-create-first-project"
                  onClick={() => setIsCreating(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 inline-flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  Create New Project
                </button>
              </div>
            </div>
          )}

          {/* Create Button when projects already exist */}
          {projects.length > 0 && !isCreating && (
            <button
              type="button"
              id="btn-create-new-project"
              onClick={() => setIsCreating(true)}
              className="w-full py-3 px-4 rounded-xl border border-dashed border-white/20 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Project
            </button>
          )}

          {/* Project Creation Form */}
          {isCreating && (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-neutral-900 border border-white/10 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  New Project Workspace
                </span>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 'E-Commerce Redesign' or 'Machine Learning Thesis'"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of what this project focuses on"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Custom AI Directives &amp; Instructions
                </label>
                <textarea
                  placeholder="e.g., 'Always use TypeScript with strict typing. Focus on performance, accessible UI, and clean design.'"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!title.trim()}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer transition-colors disabled:opacity-40"
              >
                Save &amp; Set as Active Project
              </button>
            </form>
          )}

          {/* Project List */}
          {projects.length > 0 && (
            <div className="space-y-2.5">
              {projects.map((project) => {
                const isActive = project.id === activeProjectId;
                const isEditing = editingId === project.id;
                const projectConversations = conversations.filter((c) => c.projectId === project.id);
                const projectFiles = files.filter(
                  (f) => f.projectId === project.id || (project.fileIds && project.fileIds.includes(f.id))
                );

                return (
                  <div
                    key={project.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isActive
                        ? "bg-indigo-950/30 border-indigo-500/40 shadow-lg shadow-indigo-950/50"
                        : "bg-neutral-900/60 border-white/5 hover:border-white/10"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">Title</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-black border border-indigo-500/50 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">Description</label>
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg bg-black border border-white/10 text-xs text-white"
                            placeholder="Project description..."
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-medium text-slate-300 mb-1">Custom Directives</label>
                          <textarea
                            value={editInstructions}
                            onChange={(e) => setEditInstructions(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-1.5 rounded-lg bg-black border border-white/10 text-xs text-white resize-none"
                            placeholder="Project instructions..."
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 text-xs cursor-pointer hover:bg-white/15"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(project.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold cursor-pointer hover:bg-indigo-500"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-semibold text-white truncate">
                              {project.title}
                            </h4>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                                Active
                              </span>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                              {project.description}
                            </p>
                          )}
                          {project.instructions && (
                            <div className="mt-2 p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] text-slate-400 line-clamp-2">
                              <span className="font-semibold text-indigo-400">Directives: </span>
                              {project.instructions}
                            </div>
                          )}

                          {/* Chat and File associations */}
                          <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3 text-indigo-400" />
                              {projectConversations.length} {projectConversations.length === 1 ? "chat" : "chats"}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3 text-cyan-400" />
                              {projectFiles.length} {projectFiles.length === 1 ? "file" : "files"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onSelectProject(isActive ? null : project.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                              isActive
                                ? "bg-indigo-600 text-white"
                                : "bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                            }`}
                          >
                            {isActive ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(project)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                            title="Edit project"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(project.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-neutral-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
