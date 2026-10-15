import Navbar from './Navbar';

function NoMatch() {
  return (
    <div className="App bg-background_light font-poppins dark:bg-background_dark">
      <Navbar />
      <main className="flex h-[70vh] items-center justify-center">
        Asset or wallet address not found.
      </main>
    </div>
  );
}

export default NoMatch;
