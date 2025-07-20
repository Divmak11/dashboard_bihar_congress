
interface ActivityCardProps {
  label: string;
  value: number;
  isLoading: boolean;
  isSelected: boolean;
  onClick: () => void;
  icon: string;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ 
  label, 
  value, 
  isLoading, 
  isSelected, 
  onClick, 
  icon 
}) => {
  const baseClasses = "p-4 rounded-lg shadow-md cursor-pointer transition-all duration-200 ease-in-out transform hover:-translate-y-1";
  const selectedClasses = isSelected ? "bg-blue-600 text-white shadow-lg" : "bg-white text-gray-800 hover:bg-gray-50";
  const iconBgClass = isSelected ? "bg-blue-500" : "bg-blue-100";
  const iconTextClass = isSelected ? "text-white" : "text-blue-600";

  return (
    <div className={`${baseClasses} ${selectedClasses}`} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-2 rounded-full mr-3 ${iconBgClass}`}>
            <span className={`text-xl ${iconTextClass}`}>{icon}</span>
          </div>
          <h3 className="font-semibold text-sm uppercase tracking-wider">{label}</h3>
        </div>
        <div className="text-2xl font-bold">
          {isLoading ? (
            <div className="w-8 h-8 bg-gray-300 rounded-md animate-pulse"></div>
          ) : (
            <span>{value}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
