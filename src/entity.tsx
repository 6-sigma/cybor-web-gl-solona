export interface CyborStream {
    race_name: string;
    basic_damage: number;
    basic_hp: number;
    basic_move_speed: number;
    basic_knockdown_hit: number;
    score_per_block: number | string | bigint;
    is_have_finishing_skill: boolean;
    mint_at: number;
    image: string;
    level: number;
    grade: number;
    lucky: number;
    exp: number | string | bigint;
    is_freeze: boolean;
  }