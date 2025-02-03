import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import NavigateButtons from './components/NavigateButtons';

const HomePage = () => {

  return (
    <div>
      <Header />
      <main>
        <h1>Welcome to the Home Page</h1>
        <NavigateButtons />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;
