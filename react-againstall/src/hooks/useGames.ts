import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { GamePayload } from '../types/game';
import { firestore } from '../utils/firebase';

export const useGames = (): GamePayload[] => {
    const [games, setGames] = useState<GamePayload[]>([]);
    const [update, setUpdate] = useState(0);

    useEffect(() => {
        let timer1 = setTimeout(() => setUpdate(update+1), 5000);
        return () => { clearTimeout(timer1); };
    });

    useEffect(() => {
        const unsubscribe = onSnapshot(
            query(collection(firestore, `games`)),
            querySnapshot => {
                if (querySnapshot.empty) {
                    setGames([]);
                } else {
                    setGames(
                        querySnapshot.docs.map((doc) => {
                            const data: string[] = doc.data().map
                            const map: string[][] = new Array(20).fill(null).map(() => new Array(20).fill(null))
                            for (let i = 0; i < data.length; i++) {
                                const row = Math.floor(i / 20);
                                const col = i % 20;
                                map[row][col] = data[i];
                            }
                            return {
                                id: doc.id,
                                map: map,
                            } as GamePayload
                        }),
                    );
                }
            },
        );

        return () => unsubscribe();
    }, [update]);

    return games;
};
