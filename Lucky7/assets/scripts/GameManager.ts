import { _decorator, Component, Label, Node, Sprite, SpriteFrame, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    @property(Node)
    spinOn: Node = null;

    @property(Node)
    spinOff: Node = null;

    @property([Node])
    reel1Symbols: Node[] = [];

    @property([Node])
    reel2Symbols: Node[] = [];

    @property([Node])
    reel3Symbols: Node[] = [];

    @property([SpriteFrame])
    symbolSprites: SpriteFrame[] = [];

    @property(Label)
    balanceLabel: Label = null;

    @property(Label)
    winAmount: Label = null;

    private result = {
        reel1: 0,
        reel2: 0,
        reel3: 0
    };

    private startingBalance = 1000;
    private betAmount = 20;
    private betAmountMultiplier = [1,2];

    private startPositions: Map<Node, Vec3> = new Map();

    private speed = 20;
    private isSpinning = false;
    private reelsStopped = 0;

    private reelSpeed = {
        1: 0,
        2: 0,
        3: 0
    };

    private reelActive = {
        1: false,
        2: false,
        3: false
    };

    start() {
        [...this.reel1Symbols, ...this.reel2Symbols, ...this.reel3Symbols].forEach(s => {
            this.startPositions.set(s, s.position.clone());
        });

        this.updateSymbols();
        this.balanceLabel.string = "BALANCE: " +this.startingBalance.toString();
    }

    update(dt: number) {
        if (!this.isSpinning) return;

        this.moveReel(this.reel1Symbols, 1);
        this.moveReel(this.reel2Symbols, 2);
        this.moveReel(this.reel3Symbols, 3);
    }

    moveReel(symbols: Node[], reelId: number) {

        if (!this.reelActive[reelId]) return;

        for (let i = 0; i < symbols.length; i++) {

            const s = symbols[i];

            s.setPosition(
                s.position.x,
                s.position.y - this.reelSpeed[reelId],
                0
            );

            if (s.position.y <= -500) {
                s.setPosition(
                    s.position.x,
                    s.position.y + 900,
                    0
                );
            }
        }
    }

    spin() {

        if(this.startingBalance > 0 && this.isSpinning == false)
        {
            this.spinOn.active = false;
            this.spinOff.active = true;

            this.isSpinning = true;
            this.reelsStopped = 0;

            this.reelActive[1] = true;
            this.reelActive[2] = true;
            this.reelActive[3] = true;

            this.reelSpeed[1] = this.speed;
            this.reelSpeed[2] = this.speed;
            this.reelSpeed[3] = this.speed;

            this.startingBalance -= this.betAmount;
            this.balanceLabel.string = "BALANCE: " +this.startingBalance.toString();

            // 🎰 GENERATE RESULT FIRST
            this.generateResult();

            console.log("🎰 RESULT:", this.result);

            // 🎯 APPLY RESULT TO SYMBOLS (IMPORTANT ADD)
            this.applyResultToReels();

            this.scheduleOnce(() => this.stopReel(this.reel1Symbols, 1), 2);

            this.scheduleOnce(() => {
                this.scheduleOnce(() => this.stopReel(this.reel2Symbols, 2), 1);
            }, 2);

            this.scheduleOnce(() => {
                this.scheduleOnce(() => this.stopReel(this.reel3Symbols, 3), 1);
            }, 5);
        }
    }

    // 🎯 APPLY RESULT TO REELS
    applyResultToReels() {

        const reels = [
            this.reel1Symbols,
            this.reel2Symbols,
            this.reel3Symbols
        ];

        const results = [
            this.result.reel1,
            this.result.reel2,
            this.result.reel3
        ];

    // ⏳ ADD DELAY BEFORE APPLYING RESULT
        this.scheduleOnce(() => {

            for (let r = 0; r < reels.length; r++) {

                const symbols = reels[r];
                const targetIndex = results[r];

                const middleIndex = Math.floor(symbols.length / 2);

                const sprite = symbols[middleIndex].getComponent(Sprite);

                sprite.spriteFrame = this.symbolSprites[targetIndex];
            }

            console.log("🎯 RESULT APPLIED AFTER DELAY");

        }, 0); // ⏱️ adjust mo: 0.8–2.0 seconds recommended
    }

    stopReel(symbols: Node[], reelId: number) {

        this.reelActive[reelId] = false;
        this.reelSpeed[reelId] = 0;

        const slotHeight = 200;

        for (let i = 0; i < symbols.length; i++) {

            const s = symbols[i];

            const startPos = this.startPositions.get(s);
            if (!startPos) continue;

            let index = Math.round(startPos.y / slotHeight);
            let y = index * slotHeight;

            s.setPosition(s.position.x, y, 0);
        }

        this.reelsStopped++;

        if (this.reelsStopped >= 3) {
            this.onSpinComplete();
        }
    }

    updateSymbols() {
        const symbols = [
            ...this.reel1Symbols,
            ...this.reel2Symbols,
            ...this.reel3Symbols
        ];

        symbols.forEach(s => {
            let index = Math.floor(Math.random() * 4);
            s.getComponent(Sprite).spriteFrame = this.symbolSprites[index];
        });
    }

    onSpinComplete() {

        console.log("ALL REELS STOPPED!");

        this.reelSpeed[1] = 0;
        this.reelSpeed[2] = 0;
        this.reelSpeed[3] = 0;

        this.reelActive[1] = false;
        this.reelActive[2] = false;
        this.reelActive[3] = false;

        

        // 🎯 WIN CHECK HERE
        const isWin = this.checkWin();

        if(isWin == "JACKPOT")
        {
            let amountWin = this.betAmount * this.betAmountMultiplier[1];
            this.winAmount.string = "WIN: "+(amountWin).toLocaleString();
            this.scheduleOnce(() => {
                this.winAmount.string = "WIN: 0";
                this.startingBalance += amountWin;
                this.balanceLabel.string = "BALANCE: "+this.startingBalance.toLocaleString();
            }, 2);
        }else if(isWin == "PAIR")
        {
            let amountWin = this.betAmount * this.betAmountMultiplier[0];
            this.winAmount.string = "WIN: "+(amountWin).toLocaleString();
            this.scheduleOnce(() => {
                this.winAmount.string = "WIN: 0";
                this.startingBalance += amountWin;
                this.balanceLabel.string = "BALANCE: "+this.startingBalance.toLocaleString();
            }, 2);
        }else{
            this.isSpinning = false;
            this.spinOn.active = true;
            this.spinOff.active = false;
            return;
        }


        this.scheduleOnce(() => {
            this.isSpinning = false;
            this.spinOn.active = true;
            this.spinOff.active = false;
        }, 2);
        
    }
    

    checkWin(): string {

        const r1 = this.result.reel1;
        const r2 = this.result.reel2;
        const r3 = this.result.reel3;

        // JACKPOT (3 same)
        if (r1 === r2 && r2 === r3) {

            console.log("🎰 JACKPOT!", this.result);

            return "JACKPOT";
        }

        // PAIR (2 same)
        if (
            r1 === r2 ||
            r1 === r3 ||
            r2 === r3
        ) {

            console.log("✨ PAIR MATCH!", this.result);

            return "PAIR";
        }

        console.log("❌ LOSE!", this.result);

        return "LOSE";
    }

    generateResult() {

        this.result.reel1 = Math.floor(Math.random() * 4);
        this.result.reel2 = Math.floor(Math.random() * 4);
        this.result.reel3 = Math.floor(Math.random() * 4);

        return this.result;
    }

    generateResultDummy() {

        this.result.reel1 = 0;
        this.result.reel2 = 0;
        this.result.reel3 = 0;

        return this.result;
    }
}