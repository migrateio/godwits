/**
 * Copyright (c) 2010, Pykl Studios <admin@pykl.com>, All rights reserved.
 */
package io.migrate.spring.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Map;

public class MigrateUser implements UserDetails {

	private static final Logger LOG = LoggerFactory.getLogger(MigrateUser.class);

    private Map<String, Object> user;
	private String userId;
	private String password;
	private Collection<GrantedAuthority> authorities;
	private String name = "";
	private String email;
    private String status;


    public MigrateUser(Map<String, Object> user) {
		LOG.debug("Generating new MigrateUser for user: {}", user);
        this.user = user;
		this.userId = (String) user.get("userId");
		this.name = (String) user.get("name");
		this.password = ((String) user.get("password"));

		if (user.get("email") != null) {
			this.email = (String) ((Map) user.get("email")).get("address");
			this.status = (String) ((Map) user.get("email")).get("status");
		}

		// Generate Spring authorities
		this.authorities = new ArrayList<GrantedAuthority>();
        Object[] roles = (Object[]) user.get("roles");
        for (Object role : roles) {
            if (role instanceof String)
                this.authorities.add(new SimpleGrantedAuthority((String) role));
        }
	}

	/**
	 * Returns the authorities granted to the user. Cannot return <code>null</code>.
	 *
	 * @return the authorities, sorted by natural key (never <code>null</code>)
	 */
	public Collection<GrantedAuthority> getAuthorities() {
		return authorities;
	}

	/**
	 * Returns the password used to authenticate the user. Cannot return <code>null</code>.
	 *
	 * @return the password (never <code>null</code>)
	 */
	public String getPassword() {
		return password;
	}

	/**
	 * Indicates whether the users account has expired. An expired account cannot be authenticated.
	 *
	 * @return <code>true</code> if the user's account is valid (ie non-expired), <code>false</code> if no longer valid
	 *         (ie expired)
	 */
	public boolean isAccountNonExpired() {
		return true;
	}

	/**
	 * Indicates whether the user is locked or unlocked. A locked user cannot be authenticated.
	 *
	 * @return <code>true</code> if the user is not locked, <code>false</code> otherwise
	 */
	public boolean isAccountNonLocked() {
		return (status.equalsIgnoreCase("verified"));
	}

	/**
	 * Indicates whether the user's credentials (password) has expired. Expired credentials prevent
	 * authentication.
	 *
	 * @return <code>true</code> if the user's credentials are valid (ie non-expired), <code>false</code> if no longer
	 *         valid (ie expired)
	 */
	public boolean isCredentialsNonExpired() {
		return true;
	}

	/**
	 * Indicates whether the user is enabled or disabled. A disabled user cannot be authenticated.
	 *
	 * @return <code>true</code> if the user is enabled, <code>false</code> otherwise
	 */
	public boolean isEnabled() {
		return true;
	}

    @Override
    public String getUsername() {
        return userId;
    }

    public Map<String, Object> getMap() {
        return user;
    }

    public String getEmail() {
		return email;
	}

	public String getName() {
		return name;
	}

	public String getUserId() {
		return userId;
	}

	public boolean isUser() {
		return authorities.contains(new SimpleGrantedAuthority("ROLE_USER"));
	}

	public boolean isAdmin() {
		return authorities.contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
	}

    @Override
    public String toString() {
        return "MigrateUser{" +
                "userId='" + userId + '\'' +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", status='" + status + '\'' +
                ", authorities=" + authorities +
                '}';
    }
}
