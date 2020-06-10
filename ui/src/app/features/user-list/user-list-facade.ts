/*
 * Copyright (c) 2020 the original author or authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { UserService } from 'src/app/core/user/user.service';
import { AppUser } from 'src/app/data/appUser';
import { IFacade } from 'src/app/data/facade/IFacade';
import { AppState } from 'src/app/store';
import {
  selectCurrentOrganizationId,
  selectSelectedOrganization,
  selectUserRollForSelectedOrganization,
} from 'src/app/store/organization/selectors';
import { LoadRolesEntityAction } from 'src/app/store/role/actions';
import { selectAllRoles, selectIsPendingRoleStore } from 'src/app/store/role/selectors';
import {
  DeleteUserFromOrganization,
  LoadUsersEntityAction,
  PutUpdatedUserRoleEntityAction,
} from 'src/app/store/user/action';
import { selectIsPendingUserStore, selectUsers } from 'src/app/store/user/selectors';
import { selectUserId } from 'src/app/store/userInfo/selectors';

@Injectable()
export class UserListFacade implements IFacade {
  selectedOrganization$: Observable<string>;
  selectedOrganizationName$: Observable<string>;
  users$: Observable<AppUser[]>;
  availableRoles$: Observable<string[]>;
  isLoading$: Observable<boolean>;
  currentUserId$: Observable<string>;
  userRole$: Observable<string>;

  private selectedOrganization: string;

  private selectedOrganizationSubscription: Subscription;

  constructor(
    private store: Store<AppState>,
    private userService: UserService,
  ) {
    this.selectedOrganization$ = store.select(selectCurrentOrganizationId);
    this.selectedOrganizationName$ = store.select(selectSelectedOrganization).pipe(map(org => org.name));
    this.users$ = store.select(selectUsers);
    this.userRole$ = this.store.select(selectUserRollForSelectedOrganization);

    const allRoles$ = store.select(selectAllRoles);

    this.availableRoles$ = combineLatest(
      allRoles$,
      this.userRole$
    ).pipe(
      map(
        (observResult) => {
          let res = [];
          const [allRoles, userRole] = observResult;
          const roleIndex = allRoles.indexOf(userRole);

          if (roleIndex !== -1) {
            res = allRoles.slice(roleIndex);
          }

          return res;
        }
      )
    );

    const usersLoading$ = store.select(selectIsPendingUserStore);
    const roleLoading$ = store.select(selectIsPendingRoleStore);
    this.currentUserId$ = store.select(selectUserId);

    this.isLoading$ = combineLatest(usersLoading$, roleLoading$)
      .pipe(map(observResults => !(!observResults[0] && !observResults[1])));
  }

  initSubscriptions(): void {
    this.selectedOrganizationSubscription = this.selectedOrganization$.subscribe(
      orgId => {
        if (orgId) {
          this.selectedOrganization = orgId;
          this.loadUsers();
          this.loadAvailableRoles();
        }
      }
    );
  }

  loadUsers(): void {
    this.store.dispatch(LoadUsersEntityAction({
      organizationId: this.selectedOrganization
    }));
  }

  updateUserRole(id: string, role: string): void {
    this.store.dispatch(PutUpdatedUserRoleEntityAction({
      organizationId: this.selectedOrganization,
      user: {
        id,
        role
      }
    }));
  }

  deleteUser(userId: string): void {
    this.store.dispatch(DeleteUserFromOrganization({
      organizationId: this.selectedOrganization,
      userId
    }));
  }

  loadAvailableRoles(): void {
    this.store.dispatch(LoadRolesEntityAction());
  }

  unsubscribe(): void {
    this.selectedOrganizationSubscription.unsubscribe();
  }
}
