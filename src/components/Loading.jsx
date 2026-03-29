const Loading = ({ text = 'Chargement...', percent = null }) => {
  const safePercent = percent == null ? null : Math.max(0, Math.min(100, percent))

  return (
    <div className="mask-alpha w-full max-w-sm rounded-lg border border-gray-300 px-5 py-4 shadow backdrop-blur-sm">
      <div className="mb-3 text-sm font-medium text-gray-700">{text}</div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-200 ease-out"
          style={{ width: `${safePercent ?? 18}%` }}
        />
      </div>
      <div className="mt-2 text-right text-xs text-gray-500">
        {safePercent == null ? '...' : `${safePercent}%`}
      </div>
    </div>
  )
}

export default Loading;
