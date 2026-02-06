import { User, Plus } from 'lucide-react';
import './UserProfileCard.css';

interface UserProfileCardProps {
  name: string;
  isNewUser?: boolean;
  onClick: () => void;
}

export default function UserProfileCard({ name, isNewUser = false, onClick }: UserProfileCardProps) {
  return (
    <button
      className={`user-profile-card ${isNewUser ? 'new-user' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="profile-avatar">
        {isNewUser ? (
          <Plus size={48} />
        ) : (
          <User size={48} />
        )}
      </div>
      <div className="profile-name">{name}</div>
    </button>
  );
}
