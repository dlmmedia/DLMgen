import React, { useState } from 'react';
import { Creator } from '../types';

interface CreatorCardProps {
    creator: Creator;
}

const formatFollowers = (num: number): string => {
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return num.toString();
};

export const CreatorCard: React.FC<CreatorCardProps> = ({ creator }) => {
    const [isFollowing, setIsFollowing] = useState(false);

    return (
        <div className="flex items-center justify-between p-3.5 hover:bg-gray-200/50 dark:hover:bg-white/[0.04] rounded-xl transition-all group">
            {/* Avatar & Info */}
            <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 dark:bg-white/5 border border-gray-300 dark:border-white/5 shadow-lg group-hover:border-primary/20 transition-colors">
                    <img
                        src={creator.avatarUrl}
                        alt={creator.name}
                        className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all"
                    />
                </div>
                <div>
                    <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900 dark:text-white/90 text-[13px]">{creator.name}</span>
                        {creator.isVerified && (
                            <span className="text-primary text-[10px] drop-shadow-[0_0_8px_rgba(153,27,27,0.5)]">●</span>
                        )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-white/40 font-medium">
                        {formatFollowers(creator.followers)} followers
                    </p>
                </div>
            </div>

            {/* Follow Button */}
            <button
                onClick={() => setIsFollowing(!isFollowing)}
                className={`px-5 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all ${isFollowing
                        ? 'bg-gray-200 dark:bg-white/5 text-gray-500 dark:text-white/30 border border-gray-300 dark:border-white/5'
                        : 'bg-primary text-white hover:bg-red-700 shadow-lg shadow-primary/10'
                    }`}
            >
                {isFollowing ? 'Following' : 'Follow'}
            </button>
        </div>
    );
};
