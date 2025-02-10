import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './page';
import GoogleMapPage from './googleMap/page';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path='/googleMap' element={<GoogleMapPage/>} />
      </Routes>
    </Router>
  );
};

export default App;
