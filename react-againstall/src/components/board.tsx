import './board.css';

type BoardProps = {
    board: string[][]
}

const Board = ({
    board
}: BoardProps) => {
    return (
        <div className="BoardBox">
            {board.map((row, i) => (
                <div className= "Row" key={i}>
                    {row.map((col, j) => (
                        i < 10 ? (
                            j < 10 ? (
                                <div className="YellowCell" key={j}>
                                    {col}
                                </div>
                            ) : (
                                <div className="OrangeCell" key={j}>
                                    <span key={j}>{col}</span>
                                </div>
                            )
                        ) : (
                            j < 10 ? (
                                <div className="WhiteCell" key={j}>
                                    <span key={j}>{col}</span>
                                </div>
                            ) : (
                                <div className="RedCell" key={j}>
                                    <span key={j}>{col}</span>
                                </div>
                            )
                        )
                    ))}
                </div>
            ))}
      </div>
    )
}

export default Board
