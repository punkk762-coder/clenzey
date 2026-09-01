import BaseFilter from "./baseFilter.ts";

type UserFilterInput = {
  phoneNumber?: string;
};

export default class UserFilter extends BaseFilter {
  phoneNumber: string | undefined;

  constructor({ phoneNumber }: UserFilterInput = {}) {
    super();
    this.phoneNumber = phoneNumber;
  }
}
