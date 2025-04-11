const LoadingScreen = () => {
  return (
    <div className="flex h-96 items-center justify-center">
      <div className="flex flex-col items-center space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium dark:text-slate-200">Processing document...</h3>
          <p className="text-slate-500 dark:text-slate-400">Please wait while we analyze your legal document.</p>
        </div>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300"></div>
      </div>
    </div>
  );
};

export default LoadingScreen; 