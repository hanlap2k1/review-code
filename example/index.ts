import "reflect-metadata";
import {
  container,
  inject,
  injectable,
  type DependencyContainer,
  type InjectionToken,
} from "tsyringe";


/**
 * Interface đại diện cho mọi loại động vật trong ví dụ.
 * Mỗi động vật chỉ cần biết cách phát ra âm thanh.
 */
interface IAnimal {
  makeSound(): void;
}

/**
 * Token dùng để inject động vật mặc định.
 * Trong phần đăng ký container bên dưới, token này đang trỏ tới Cat.
 */
const KEY_ROOM_ANIMAL = Symbol("RoomAnimal");
const KEY_CAGE_ANIMAL = Symbol("CageAnimal");

/**
 * Token riêng cho Dog.
 * Dùng khi một dependency cần chắc chắn nhận vào Dog thay vì động vật mặc định.
 */
const KEY_DOG = Symbol("Dog");

/**
 * Token riêng cho Cat.
 * Dùng khi một dependency cần chắc chắn nhận vào Cat.
 */
const KEY_CAT = Symbol("Cat");

/**
 * Class Dog implement IAnimal.
 * Khi gọi makeSound(), Dog sẽ in ra tiếng chó sủa.
 */
class Dog implements IAnimal {
  constructor() {}

  makeSound() {
    console.log("Woof woof");
  }
}

/**
 * Class Cat implement IAnimal.
 * Khi gọi makeSound(), Cat sẽ in ra tiếng mèo kêu.
 */
class Cat implements IAnimal {
  constructor() {}

  makeSound() {
    console.log("Meow meow");
  }
}

/**
 * Interface đại diện cho một cái chuồng.
 * Chuồng có thể yêu cầu động vật bên trong phát ra âm thanh.
 */
interface ICage {
  animalMakeSound(): void;
}

/**
 * Token dùng để inject Cage.
 */
const KEY_CAGE = Symbol("Cage");

/**
 * Đánh dấu Cage là class có thể được tsyringe khởi tạo thông qua container.
 */
@injectable()
class Cage implements ICage {
  /**
   * Cage inject animal theo vai trò KEY_CAGE_ANIMAL.
   * Animal cụ thể là Dog hay Cat sẽ do container của từng room quyết định.
   */
  constructor(@inject(KEY_CAGE_ANIMAL) private animal: IAnimal) {}

  /**
   * In tên khu vực "Cage", sau đó gọi tiếng kêu của động vật trong chuồng.
   */
  animalMakeSound() {
    console.log("Cage");
    this.animal.makeSound();
  }
}

/**
 * Interface đại diện cho một căn phòng.
 * Phòng có thể yêu cầu động vật trong phòng và chuồng trong phòng phát ra âm thanh.
 */
interface IRoom {
  animalMakeSound(): void;
}

/**
 * Hai token riêng cho hai Room khác nhau trong Farm.
 * Vì first và second dùng token khác nhau, container có thể đăng ký implementation
 * hoặc factory khác nhau cho từng phòng nếu cần.
 */
const KEY_FIRST_ROOM = Symbol("FirstRoom");
const KEY_SECOND_ROOM = Symbol("SecondRoom");

/**
 * Đánh dấu Room là class có thể được tsyringe khởi tạo thông qua container.
 */
@injectable()
class Room implements IRoom {
  /**
   * Room cần 2 dependency:
   * - KEY_ROOM_ANIMAL: động vật chính trong phòng.
   * - KEY_CAGE: chuồng trong phòng.
   */
  constructor(
    @inject(KEY_ROOM_ANIMAL) private animal: IAnimal,
    @inject(KEY_CAGE) private cage: ICage,
  ) {}

  /**
   * In tên khu vực "Room", sau đó:
   * - cho động vật chính trong phòng phát ra âm thanh.
   * - cho động vật trong chuồng phát ra âm thanh.
   */
  animalMakeSound() {
    console.log("Room");
    this.animal.makeSound();
    this.cage.animalMakeSound();
  }
}

/**
 * Interface đại diện cho trang trại.
 * Farm có hai phòng: first và second.
 */
interface IFarm {
  firstMakeSound(): void;
  secondMakeSound(): void;
}

/**
 * Đánh dấu Farm là class có thể được tsyringe khởi tạo thông qua container.
 */
@injectable()
class Farm implements IFarm {
  /**
   * Farm inject hai Room bằng hai token khác nhau.
   * KEY_FIRST_ROOM dùng cấu hình mặc định: Room có Cat, Cage có Dog.
   * KEY_SECOND_ROOM dùng cấu hình riêng: Room có Dog, Cage có Cat.
   */
  constructor(
    @inject(KEY_FIRST_ROOM) private first: IRoom,
    @inject(KEY_SECOND_ROOM) private second: IRoom,
  ) {}

  /**
   * Gọi logic phát âm thanh của phòng thứ nhất.
   */
  firstMakeSound() {
    this.first.animalMakeSound();
  }

  /**
   * Gọi logic phát âm thanh của phòng thứ hai.
   */
  secondMakeSound() {
    this.second.animalMakeSound();
  }
}

/**
 * Đăng ký token KEY_DOG với class Dog.
 * Token này đang được Cage mặc định và second room sử dụng.
 */
container.register<IAnimal>(KEY_DOG, {
  useClass: Dog,
});

/**
 * Đăng ký token KEY_CAT với class Cat.
 * Token này được dùng khi tạo Cage riêng cho second room.
 */
container.register<IAnimal>(KEY_CAT, {
  useClass: Cat,
});

/**
 * Đăng ký token KEY_CAGE với class Cage.
 * Khi Room cần ICage, container sẽ tạo Cage và tự inject Dog vào Cage.
 */
container.register<ICage>(KEY_CAGE, {
  useClass: Cage,
});

/**
 * Tạo một Room bằng child container.
 * Child container cho phép override animal của Room và Cage theo từng trường hợp,
 * trong khi tsyringe vẫn là nơi resolve toàn bộ object graph: Room -> Cage -> Animal.
 */
function createRoom(
  dependency_container: DependencyContainer,
  room_animal_token: InjectionToken<IAnimal>,
  cage_animal_token: InjectionToken<IAnimal>,
): IRoom {
  const room_container = dependency_container.createChildContainer();

  room_container.register<IAnimal>(KEY_ROOM_ANIMAL, {
    useToken: room_animal_token,
  });
  room_container.register<IAnimal>(KEY_CAGE_ANIMAL, {
    useToken: cage_animal_token,
  });

  return room_container.resolve(Room);
}

/**
 * Đăng ký phòng thứ nhất.
 * Phòng thứ nhất dùng cấu hình riêng:
 * - Animal chính trong Room là Cat.
 * - Animal bên trong Cage là Dog.
 */
container.register<IRoom>(KEY_FIRST_ROOM, {
  useFactory: (dependencyContainer) =>
    createRoom(dependencyContainer, KEY_CAT, KEY_DOG),
});

/**
 * Đăng ký phòng thứ hai.
 * Phòng thứ hai dùng cấu hình riêng:
 * - Animal chính trong Room là Dog.
 * - Animal bên trong Cage là Cat.
 */
container.register<IRoom>(KEY_SECOND_ROOM, {
  useFactory: (dependencyContainer) =>
    createRoom(dependencyContainer, KEY_DOG, KEY_CAT),
});

/**
 * Resolve Farm từ container.
 * tsyringe sẽ tự dựng dependency theo chuỗi:
 * first: Farm -> Room -> Cat, Cage -> Dog
 * second: Farm -> Room -> Dog, Cage -> Cat
 */
const farm = container.resolve(Farm);

/**
 * Chạy thử phòng thứ nhất.
 */
farm.firstMakeSound();

/**
 * Chạy thử phòng thứ hai.
 */
farm.secondMakeSound();
