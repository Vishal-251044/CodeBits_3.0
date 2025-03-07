const GoogleFitConnect = () => {
    const handleGoogleFitLogin = () => {
      window.location.href = "https://googlefitapi-skimgworld.onrender.com/login"; // Backend login route
    };
  
    return (
      <button onClick={handleGoogleFitLogin} className="btn">
        Connect Google Fit
      </button>
    );
  };
  
  export default GoogleFitConnect;
  