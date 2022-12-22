import './board.css';

type BoardProps = {
    board: string[][]
    cities: string[]
    temperatures: number[]
}

const Board = ({
    board,
    cities,
    temperatures
}: BoardProps) => {
    return (
        <>
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
        <div className="YellowCell"/>
        {cities[0]} {temperatures[0]}
        <div className="OrangeCell"/>
        {cities[1]} {temperatures[1]}
        <div className="WhiteCell"/>
        {cities[2]} {temperatures[2]}
        <div className="RedCell"/>
        {cities[3]} {temperatures[3]}
      </>
    )
}

export default Board
