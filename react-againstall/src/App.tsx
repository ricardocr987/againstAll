import './App.css';
import { useGames } from './hooks/useGames';
import Board from './components/board'

function App(): JSX.Element {
  const games = useGames()

  return (
    <div className='app'>
      { games.length > 0 ? (
            games.map((game, index) => (
              <Board board={game.map} cities={game.cities} temperatures={game.temperatures} key={index}/>
            ))
            
        ) : (
          <>
            No active games
          </>
        )
      }    
    </div>
  );
}

export default App;
