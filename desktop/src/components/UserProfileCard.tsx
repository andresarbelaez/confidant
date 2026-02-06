import { User, Plus, UserX } from 'lucide-react';
import './UserProfileCard.css';

interface UserProfileCardProps {
  name: string;
  isNewUser?: boolean;
  isGuest?: boolean;
  onClick: () => void;
}

export default function UserProfileCard({ name, isNewUser = false, isGuest = false, onClick }: UserProfileCardProps) {
  return (
    <button
      className={`user-profile-card ${isNewUser ? 'new-user' : ''} ${isGuest ? 'guest' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="profile-avatar">
        {isNewUser ? (
          <Plus size={48} />
        ) : isGuest ? (
          <UserX size={48} />
        ) : (
          <User size={48} />
        )}
      </div>
      <div className="profile-name">{name}</div>
    </button>
  );
}
