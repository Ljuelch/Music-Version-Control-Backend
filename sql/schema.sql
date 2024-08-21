CREATE TABLE IF NOT EXISTS tuser (
    id        INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    email     VARCHAR(255) NOT NULL,
    password  VARCHAR(255) NOT NULL,
    username  VARCHAR(255) NOT NULL,
    firstname VARCHAR(255),
    lastname  VARCHAR(255),
    public    BOOLEAN NOT NULL DEFAULT TRUE,
    blocked   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS tsession (
    session   CHAR(64) PRIMARY KEY,
    user_id   INT UNSIGNED,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES tuser(id)
);

CREATE TABLE IF NOT EXISTS tproject (
    id   INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS tprojectuser (
    id         INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id    INT UNSIGNED,
    project_id INT UNSIGNED,
    role       CHAR(1) NOT NULL,

    FOREIGN KEY (user_id)    REFERENCES tuser(id),
    FOREIGN KEY (project_id) REFERENCES tproject(id)
);

CREATE TABLE IF NOT EXISTS tprojectversion (
    id            INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    project_id    INT UNSIGNED,
    versionNumber INT UNSIGNED NOT NULL,
    timestamp     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    songBPM       SMALLINT UNSIGNED,
    songKey       VARCHAR(10),

    FOREIGN KEY (project_id) REFERENCES tproject(id),
    UNIQUE (project_id, versionNumber)
);

CREATE TABLE IF NOT EXISTS tprojectchecklist (
    id                       INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    projectversionId         INT UNSIGNED,
    user_id                  INT UNSIGNED,
    timestamp                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    text                     VARCHAR(255) NOT NULL,
    checkedProjectversion_id INT UNSIGNED DEFAULT NULL,
    rejected                 BOOLEAN,

    FOREIGN KEY (user_id)                  REFERENCES tuser(id),
    FOREIGN KEY (projectversionId)         REFERENCES tprojectversion(id),
    FOREIGN KEY (checkedProjectversion_id) REFERENCES tprojectversion(id)
);

CREATE TABLE IF NOT EXISTS tprojectchecklistmarker (
    id                  INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    projectchecklist_id INT UNSIGNED,
    user_id             INT UNSIGNED,
    color               CHAR(6) NOT NULL,
    start               DECIMAL(5,1) NOT NULL,
    end                 DECIMAL(5,1) DEFAULT NULL,

    FOREIGN KEY (user_id)             REFERENCES tuser(id),
    FOREIGN KEY (projectchecklist_id) REFERENCES tprojectchecklist(id)
);

CREATE TABLE IF NOT EXISTS tprojectversionfile (
    id                INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    hash              CHAR(128),
    projectversion_id INT UNSIGNED,
    type              CHAR(3),

    FOREIGN KEY (projectversion_id) REFERENCES tprojectversion(id)
);

CREATE TABLE IF NOT EXISTS tprojectversionstemsgroup (
    id                INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    projectversion_id INT UNSIGNED,
    name              VARCHAR(255) DEFAULT NULL,

    FOREIGN KEY (projectversion_id) REFERENCES tprojectversion(id)
);

CREATE TABLE IF NOT EXISTS tprojectversionstems (
    id                         INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    projectversionfile_id      INT UNSIGNED,
    projectversionstemgroup_id INT UNSIGNED,
    name                       VARCHAR(255),
    type                       CHAR(3),

    FOREIGN KEY (projectversionfile_id)      REFERENCES tprojectversionfile(id),
    FOREIGN KEY (projectversionstemgroup_id) REFERENCES tprojectversionstemsgroup(id)
);

CREATE TABLE IF NOT EXISTS tusernotification (
    id                     INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id                INT UNSIGNED,
    notificationTemplateId SMALLINT UNSIGNED,
    timestamp              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    isRead                 BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS tusernotificationparam (
    id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    notification_id INT UNSIGNED,
    paramKey        VARCHAR(100),
    paramValue      VARCHAR(255),

    FOREIGN KEY (notification_id) REFERENCES tusernotification(id)
);

CREATE TABLE IF NOT EXISTS tuserresetpassword (
    resetKey  CHAR(32) PRIMARY KEY,
    user_id   INT UNSIGNED,
    isPrivate BOOLEAN NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES tuser(id)
);

CREATE TABLE IF NOT EXISTS tuserfollow (
    id            INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id       INT UNSIGNED,
    followUser_id INT UNSIGNED,

    FOREIGN KEY (user_id)       REFERENCES tuser(id),
    FOREIGN KEY (followUser_id) REFERENCES tuser(id)
)