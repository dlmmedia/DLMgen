import React, { useState } from 'react';
import { Workspace } from '../../types';
import { FolderOpen, MoreVertical, Pencil, Trash2, Star } from 'lucide-react';

interface WorkspaceCardProps {
  workspace: Workspace;
  trackCount: number;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDefault?: boolean;
}

export const WorkspaceCard: React.FC<WorkspaceCardProps> = ({
  workspace,
  trackCount,
  onClick,
  onEdit,
  onDelete,
  isDefault = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group relative bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:bg-white/[0.05] hover:border-white/10 transition-all cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Folder Icon */}
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className={`
          w-full h-full rounded-xl flex items-center justify-center
          ${isDefault 
            ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30' 
            : 'bg-gradient-to-br from-blue-500/30 to-indigo-600/30'
          }
        `}>
          <FolderOpen 
            size={28} 
            className={isDefault ? 'text-amber-400/80' : 'text-blue-400/80'} 
          />
        </div>
        
        {/* Default Badge */}
        {isDefault && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
            <Star size={10} className="text-white fill-white" />
          </div>
        )}
      </div>

      {/* Info */}
      <h3 className="font-semibold text-sm text-white text-center truncate mb-1">
        {workspace.name}
      </h3>
      <p className="text-xs text-gray-500 text-center">
        {trackCount} {trackCount === 1 ? 'song' : 'songs'}
      </p>
      
      {workspace.description && (
        <p className="text-xs text-gray-600 text-center mt-1 truncate">
          {workspace.description}
        </p>
      )}

      {/* Menu Button */}
      {!isDefault && (onEdit || onDelete) && (
        <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white transition-opacity ${
              isHovered || showMenu ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <MoreVertical size={14} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-36 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden z-50">
                {onEdit && (
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-200 hover:bg-white/5 transition-colors"
                  >
                    <Pencil size={14} />
                    <span>Rename</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

