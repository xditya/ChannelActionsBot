import config from "$env";

const owners: number[] = [];
for (const owner of config.OWNERS.split(" ")) {
  owners.push(Number(owner));
}

class Helpers {
  OWNERS = owners;
  START_TIME = new Date().valueOf();
}

export default new Helpers();
